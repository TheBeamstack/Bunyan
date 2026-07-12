// Bunyan kernel — the C++ side of the protocol seam.
//
// THE ARCHITECTURAL POINT, stated once: JavaScript never touches OCCT. It calls *our* operations
// (makeBox, measure, tessellate, releaseShape); the geometry logic lives here, in C++, compiled into
// the WASM module. Three consequences that decide whether this product can grow to Revit scale:
//
//   1. The JS<->WASM binding surface is OUR op set, and it stays small and stable no matter how big
//      OCCT usage gets. opencascade.js does the opposite — it exposes ALL of OCCT to JS, which is why
//      it ships 62.8 MB and why every OCCT call pays a boundary crossing.
//   2. The linker only keeps OCCT code these ops actually reach, so the artifact is proportional to
//      what we use, not to all of OCCT.
//   3. Growing the product = writing more C++ ops (sweeps, HLR drawings, shape healing, IFC import),
//      not growing the binding surface. IfcOpenShell can later link against this same OCCT build.

#include <emscripten/bind.h>

#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <BRepBndLib.hxx>
#include <Bnd_Box.hxx>
#include <BRep_Tool.hxx>
#include <BRepTools.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <Poly_Triangulation.hxx>
#include <TopLoc_Location.hxx>
#include <Standard_Failure.hxx>
#include <GCPnts_AbscissaPoint.hxx>
#include <BRepAdaptor_Curve.hxx>

#include <map>
#include <string>
#include <vector>

namespace {

struct Bounds {
  double xMin, yMin, zMin, xMax, yMax, zMax;
};

// The exact-measurement result. This is the `measure` op the owner approved: values come from OCCT's
// BRepGProp, NOT from the tessellation — so a curved solid (a circular column) is reported exactly
// instead of being under-reported by the chord error of its triangles.
struct Measure {
  double volume;
  double area;
  double edgeLength;
  int solids, faces, edges, vertices;
};

struct Mesh {
  std::vector<float> positions;
  std::vector<float> normals;
  std::vector<int> indices;
  // Per-triangle owning face index -> the provenance channel that makes picking authorable.
  std::vector<int> triangleFace;
};

std::map<int, TopoDS_Shape> g_shapes;
int g_nextHandle = 1;
std::string g_lastError;

const TopoDS_Shape* lookup(int handle) {
  auto it = g_shapes.find(handle);
  return it == g_shapes.end() ? nullptr : &it->second;
}

}  // namespace

std::string lastError() { return g_lastError; }

int makeBox(double dx, double dy, double dz) {
  g_lastError.clear();
  try {
    if (!(dx > 0) || !(dy > 0) || !(dz > 0)) {
      g_lastError = "INVALID_PAYLOAD: dx/dy/dz must be positive and finite";
      return 0;
    }
    TopoDS_Shape shape = BRepPrimAPI_MakeBox(dx, dy, dz).Shape();
    int handle = g_nextHandle++;
    g_shapes[handle] = shape;
    return handle;
  } catch (const Standard_Failure& e) {
    // OCCT failures are marshalled, never thrown across the boundary (spec §6.4 / D10).
    g_lastError = std::string("OCCT_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
    // Emscripten can surface a bare integer rather than an Error. The mock's test suite already
    // covers this class of throw; the real kernel must not be the place it escapes.
    g_lastError = "OCCT_FAILURE: non-standard throw";
    return 0;
  }
}

Bounds getBounds(int handle) {
  Bounds b{0, 0, 0, 0, 0, 0};
  const TopoDS_Shape* s = lookup(handle);
  if (!s) {
    g_lastError = "HANDLE_NOT_FOUND";
    return b;
  }
  Bnd_Box box;
  BRepBndLib::Add(*s, box);
  box.Get(b.xMin, b.yMin, b.zMin, b.xMax, b.yMax, b.zMax);
  return b;
}

Measure measure(int handle) {
  Measure m{0, 0, 0, 0, 0, 0, 0};
  const TopoDS_Shape* s = lookup(handle);
  if (!s) {
    g_lastError = "HANDLE_NOT_FOUND";
    return m;
  }
  try {
    GProp_GProps vol;
    BRepGProp::VolumeProperties(*s, vol);
    m.volume = vol.Mass();

    GProp_GProps surf;
    BRepGProp::SurfaceProperties(*s, surf);
    m.area = surf.Mass();

    // Edge length is summed over UNIQUE edges, deliberately.
    //
    // Calling BRepGProp::LinearProperties on a *solid* sums every edge once per adjoining face, so a
    // box reports 45,600 mm for edges that total 22,800 mm. That exact bug was caught by the
    // closed-form check when the goldens were first seeded (current_state.md §4a(2)) — it is OUR
    // misuse of OCCT's API, not an OCCT defect, and it is the reason the closed-form tier exists.
    TopTools_IndexedMapOfShape edgeMap;
    TopExp::MapShapes(*s, TopAbs_EDGE, edgeMap);
    double total = 0.0;
    for (int i = 1; i <= edgeMap.Extent(); ++i) {
      const TopoDS_Edge& e = TopoDS::Edge(edgeMap(i));
      if (BRep_Tool::Degenerated(e)) continue;
      BRepAdaptor_Curve curve(e);
      total += GCPnts_AbscissaPoint::Length(curve);
    }
    m.edgeLength = total;

    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(*s, TopAbs_SOLID, map);   m.solids = map.Extent();   map.Clear();
    TopExp::MapShapes(*s, TopAbs_FACE, map);    m.faces = map.Extent();    map.Clear();
    TopExp::MapShapes(*s, TopAbs_EDGE, map);    m.edges = map.Extent();    map.Clear();
    TopExp::MapShapes(*s, TopAbs_VERTEX, map);  m.vertices = map.Extent();
    return m;
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_FAILURE: ") + e.GetMessageString();
    return m;
  }
}

Mesh tessellate(int handle, double deflection) {
  Mesh mesh;
  const TopoDS_Shape* s = lookup(handle);
  if (!s) {
    g_lastError = "HANDLE_NOT_FOUND";
    return mesh;
  }
  try {
    BRepMesh_IncrementalMesh mesher(*s, deflection);
    mesher.Perform();

    // Faces are indexed off a canonical map, so a triangle's owning face is a STABLE index rather
    // than an accident of traversal order. That index is what the naming layer resolves to a
    // SubShapeRef; it must not depend on how OCCT happened to walk the shape.
    TopTools_IndexedMapOfShape faceMap;
    TopExp::MapShapes(*s, TopAbs_FACE, faceMap);

    for (int fi = 1; fi <= faceMap.Extent(); ++fi) {
      const TopoDS_Face& face = TopoDS::Face(faceMap(fi));
      TopLoc_Location loc;
      Handle(Poly_Triangulation) tri = BRep_Tool::Triangulation(face, loc);
      if (tri.IsNull()) continue;

      const gp_Trsf& trsf = loc.Transformation();
      const int base = static_cast<int>(mesh.positions.size() / 3);
      const bool reversed = (face.Orientation() == TopAbs_REVERSED);

      tri->ComputeNormals();
      for (int i = 1; i <= tri->NbNodes(); ++i) {
        gp_Pnt p = tri->Node(i).Transformed(trsf);
        mesh.positions.push_back(static_cast<float>(p.X()));
        mesh.positions.push_back(static_cast<float>(p.Y()));
        mesh.positions.push_back(static_cast<float>(p.Z()));

        gp_Dir n = tri->Normal(i);
        if (reversed) n.Reverse();
        gp_Dir nt = n.Transformed(trsf);
        mesh.normals.push_back(static_cast<float>(nt.X()));
        mesh.normals.push_back(static_cast<float>(nt.Y()));
        mesh.normals.push_back(static_cast<float>(nt.Z()));
      }

      for (int i = 1; i <= tri->NbTriangles(); ++i) {
        int a, b, c;
        tri->Triangle(i).Get(a, b, c);
        if (reversed) std::swap(b, c);
        mesh.indices.push_back(base + a - 1);
        mesh.indices.push_back(base + b - 1);
        mesh.indices.push_back(base + c - 1);
        mesh.triangleFace.push_back(fi - 1);  // 0-based, matches the TS provenance channel
      }
    }
    return mesh;
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_FAILURE: ") + e.GetMessageString();
    return mesh;
  }
}

bool releaseShape(int handle) { return g_shapes.erase(handle) > 0; }
int liveHandles() { return static_cast<int>(g_shapes.size()); }

EMSCRIPTEN_BINDINGS(bunyan_kernel) {
  using namespace emscripten;

  register_vector<float>("VectorFloat");
  register_vector<int>("VectorInt");

  value_object<Bounds>("Bounds")
      .field("xMin", &Bounds::xMin).field("yMin", &Bounds::yMin).field("zMin", &Bounds::zMin)
      .field("xMax", &Bounds::xMax).field("yMax", &Bounds::yMax).field("zMax", &Bounds::zMax);

  value_object<Measure>("Measure")
      .field("volume", &Measure::volume)
      .field("area", &Measure::area)
      .field("edgeLength", &Measure::edgeLength)
      .field("solids", &Measure::solids)
      .field("faces", &Measure::faces)
      .field("edges", &Measure::edges)
      .field("vertices", &Measure::vertices);

  value_object<Mesh>("Mesh")
      .field("positions", &Mesh::positions)
      .field("normals", &Mesh::normals)
      .field("indices", &Mesh::indices)
      .field("triangleFace", &Mesh::triangleFace);

  function("makeBox", &makeBox);
  function("getBounds", &getBounds);
  function("measure", &measure);
  function("tessellate", &tessellate);
  function("releaseShape", &releaseShape);
  function("liveHandles", &liveHandles);
  function("lastError", &lastError);
}

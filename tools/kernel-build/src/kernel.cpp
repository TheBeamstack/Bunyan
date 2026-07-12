// Bunyan kernel — the C++ side of the protocol seam.
//
// THE ARCHITECTURAL POINT, stated once: JavaScript never touches OCCT. It calls *our* operations
// (makeBox, makeCylinder, boolean, fillet, measure, tessellate, …); the geometry logic lives here, in
// C++, compiled into the WASM module. Three consequences that decide whether this product can grow to
// Revit scale:
//
//   1. The JS<->WASM binding surface is OUR op set, and it stays small and stable no matter how big
//      OCCT usage gets. opencascade.js does the opposite — it exposes ALL of OCCT to JS, which is why
//      it ships 62.8 MB and why every OCCT call pays a boundary crossing.
//   2. The linker only keeps OCCT code these ops actually reach, so the artifact is proportional to
//      what we use, not to all of OCCT.
//   3. Growing the product = writing more C++ ops (sweeps, HLR drawings, shape healing, IFC import),
//      not growing the binding surface. IfcOpenShell can later link against this same OCCT build.
//
// THE DIVISION OF LABOUR WITH TYPESCRIPT, because getting it wrong would break persistent naming
// (decision D18): this file answers "which sub-shape is this, STRUCTURALLY?" — it derives, for every
// output sub-shape, WHERE IT CAME FROM, as pure structure: an operand index, a sub-shape index, a
// relation. It never sees a `nodeId`, never builds a ref token, and never looks at a coordinate.
// TypeScript answers "WHOSE is it?" — it turns those structural facts into `SubShapeRef` tokens.
//
// ⚠ Everything below rests on measurements, not on the literature. `tools/kernel-build/probe.cpp`
// measured what OCCT 7.9.3's history actually reports for a cylinder, three booleans and two fillets
// (including a fillet on a boolean-made edge — the case the spec calls the hardest). Read
// current_state.md Entry 9 before changing the naming rules; the numbers there are why they are what
// they are.

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrim_Cylinder.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepAlgoAPI_BooleanOperation.hxx>
#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepBuilderAPI_MakeShape.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <BRepBndLib.hxx>
#include <Bnd_Box.hxx>
#include <BRep_Tool.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <BRepClass3d_SolidClassifier.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_IndexedDataMapOfShapeListOfShape.hxx>
#include <TopTools_ListOfShape.hxx>
#include <Poly_Triangulation.hxx>
#include <Poly_PolygonOnTriangulation.hxx>
#include <TColStd_Array1OfInteger.hxx>
#include <TopLoc_Location.hxx>
#include <Standard_Failure.hxx>
#include <GCPnts_AbscissaPoint.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <gp_Ax2.hxx>
#include <gp_Pnt.hxx>
#include <gp_Dir.hxx>

#include <algorithm>
#include <array>
#include <map>
#include <string>
#include <vector>

namespace {

struct Bounds {
  double xMin, yMin, zMin, xMax, yMax, zMax;
};

// The exact-measurement result. Values come from OCCT's BRepGProp, NOT from the tessellation — so a
// curved solid (a circular column) is reported exactly instead of being under-reported by the chord
// error of its triangles.
struct Measure {
  double volume;
  double area;
  double edgeLength;
  int solids, faces, edges, vertices;
};

// The result of a proximity query (the D23 geometric queries).
struct Proximity {
  double distance;
  double ax, ay, az;  // the witness point on shape A …
  double bx, by, bz;  // … and on shape B. Together they say WHERE the two shapes are closest.
};

// ---------------------------------------------------------------------------------------------
// PERSISTENT NAMING (D1) — the structural half.
//
// Every output sub-shape is accounted for by exactly one of four RELATIONS. They are tried in this
// order, and the order is the design:
//
//   PRIMITIVE  The operation names it itself, from its OWN semantic accessors
//              (BRepPrimAPI_MakeBox::BackFace(), BRepPrim_Cylinder::LateralFace()). Primitives have
//              no ancestors, so nothing else could name them.
//
//   INHERIT    Exactly one operand sub-shape maps to it, and it is that operand sub-shape's only
//              output. It therefore IS that sub-shape, still: it KEEPS ITS TOKEN, unchanged.
//              ⚠ THIS IS THE ONE THAT MAKES BIM WORK. When a window is cut into a wall, the wall's
//              front face is `Modified` but it is still one face — so it stays `wall-1/face/y-min#0`.
//              A second window, or a fillet elsewhere, does not re-target the first window's host.
//              ⚠ It also covers the relation OCCT does NOT report at all: an untouched sub-shape is
//              passed through as the SAME shape and appears in no history list. Read naively, that
//              silence looks like "unknown"; it means "unchanged". Measured: on a simple cut, FOUR of
//              the wall's six faces are accounted for by nothing but this.
//
//   DERIVE     It has ancestors, but it is not any single one of them: a face SPLIT into several, a
//              coplanar MERGE of two, or a wholly new sub-shape GENERATED by them (a boolean's
//              section curve; a fillet's face, generated from the edge it rounds). Its identity is
//              the operation applied to the (canonically ordered) set of its ancestors, plus an
//              occurrence index when several siblings share that same set.
//
//   ADJACENT   History says nothing, and it is not a pass-through either — OCCT rebuilt it as a new
//              object. Measured: this is what a FILLET does to the edges and vertices around it (the
//              boolean, contrary to the literature, does not). An edge is then named by the pair of
//              faces that bound it, and those faces ARE named — so the name is still structural, and
//              still floating-point-free.
//
// If none of the four applies, the operation FAILS. It does not guess. A wrong-but-plausible name is
// far more expensive than a refusal: it surfaces months later as a window that moved to another wall.
// ---------------------------------------------------------------------------------------------
const int REL_PRIMITIVE = 0;
const int REL_INHERIT = 1;
const int REL_DERIVE = 2;
const int REL_ADJACENT = 3;

const int KIND_FACE = 0;
const int KIND_EDGE = 1;

// One output sub-shape's structural account of itself. Pure integers and, for primitives, a role the
// operation supplied. No tokens, no node ids, no coordinates — TypeScript composes the identity.
struct NameRow {
  int relation;
  std::string role;  // REL_PRIMITIVE only
  int rank;          // occurrence among siblings that share the same derivation
  // The ancestors, as parallel arrays (an operand index, a sub-shape kind, a canonical index).
  std::vector<int> srcOperand;
  std::vector<int> srcKind;
  std::vector<int> srcIndex;
  int viaA, viaB;  // REL_ADJACENT only: the canonical indices of the two bounding OUTPUT faces
};

NameRow blankRow() {
  NameRow r;
  r.relation = -1;
  r.rank = 0;
  r.viaA = -1;
  r.viaB = -1;
  return r;
}

struct Naming {
  std::vector<NameRow> faces;
  std::vector<NameRow> edges;
  std::vector<int> operands;  // the operand handles, in the order the op received them
};

// A live shape, plus the identities the operation assigned to its sub-shapes.
//
// `faces`/`edges` are in CANONICAL order, which is NOT OCCT's traversal order. Everything downstream
// (triangle -> face index -> ref) indexes into these, so the canonical order IS the contract: it must
// depend only on the operation and its inputs, so that the same recipe rebuilt on another machine
// yields the same identities (spec §6.5).
struct ShapeEntry {
  TopoDS_Shape shape;
  std::vector<NameRow> faces;
  std::vector<int> faceOcct;  // canonical face index -> OCCT face-map index (1-based)
  std::vector<NameRow> edges;
  std::vector<int> edgeOcct;
  std::vector<int> operands;  // handles of the operand shapes, in order
};

std::map<int, ShapeEntry> g_shapes;
int g_nextHandle = 1;
std::string g_lastError;

// The last tessellation. It is a MEMBER, not a local, because `tessellate` hands JavaScript
// *typed_memory_view*s — zero-copy windows onto these very buffers — and a local would be destroyed
// before JS could read them.
//
// ⚠ THE CONTRACT, and it is sharp: the views handed to JS are valid ONLY until the next `tessellate`
// call. The TypeScript adapter copies them into its own Float32Array/Uint32Array synchronously, before
// doing anything else, which is what makes this safe. Do not hold a view across an await.
//
// Why bother instead of returning an embind std::vector: reading an embind vector costs ONE JS<->WASM
// crossing PER ELEMENT. A 200k-vertex model would pay ~1.8 million crossings per tessellation, on
// every drag frame — silently reintroducing exactly the per-element boundary cost that this whole
// architecture exists to avoid (see the header comment). A memory view costs one crossing, total.
struct Mesh {
  std::vector<float> positions;
  std::vector<float> normals;
  std::vector<int> indices;
  std::vector<int> triangleFace;
  std::vector<float> edgePositions;
  std::vector<int> edgeIndex;
  std::vector<int> edgeStart;
  std::vector<int> edgeCount;
};
Mesh g_mesh;

ShapeEntry* lookup(int handle) {
  auto it = g_shapes.find(handle);
  return it == g_shapes.end() ? nullptr : &it->second;
}

// ---------------------------------------------------------------------------------------------
// The resolver's working state for one operation.
// ---------------------------------------------------------------------------------------------
struct Resolver {
  const std::vector<const ShapeEntry*>& operands;
  BRepBuilderAPI_MakeShape& maker;
  const TopoDS_Shape& result;

  TopTools_IndexedMapOfShape outF, outE, outV;
  TopTools_IndexedDataMapOfShapeListOfShape edgeFaces, vertFaces;

  // OCCT output index (1-based) -> the ancestors claiming it, as (operand, kind, index) triples.
  std::map<int, std::vector<std::array<int, 3>>> faceSrc, edgeSrc;

  Resolver(const std::vector<const ShapeEntry*>& ops, BRepBuilderAPI_MakeShape& mk,
           const TopoDS_Shape& res)
      : operands(ops), maker(mk), result(res) {
    TopExp::MapShapes(result, TopAbs_FACE, outF);
    TopExp::MapShapes(result, TopAbs_EDGE, outE);
    TopExp::MapShapes(result, TopAbs_VERTEX, outV);
    TopExp::MapShapesAndAncestors(result, TopAbs_EDGE, TopAbs_FACE, edgeFaces);
    TopExp::MapShapesAndAncestors(result, TopAbs_VERTEX, TopAbs_FACE, vertFaces);
  }

  // Ask the maker where one operand sub-shape went, and record the claim on whatever it produced.
  //
  // ⚠ IDENTITY IS ASKED FIRST AND SEPARATELY, because OCCT does not report it. `Modified()` returns
  // only the SPLITS of a shape; a sub-shape the operation never touched is simply passed through and
  // named nowhere. See the note on REL_INHERIT.
  void claim(int operand, int kind, int index, const TopoDS_Shape& sub) {
    const std::array<int, 3> src{operand, kind, index};

    const auto record = [&](const TopoDS_Shape& out) {
      if (out.ShapeType() == TopAbs_FACE) {
        const int at = outF.FindIndex(out);
        if (at != 0) faceSrc[at].push_back(src);
      } else if (out.ShapeType() == TopAbs_EDGE) {
        const int at = outE.FindIndex(out);
        if (at != 0) edgeSrc[at].push_back(src);
      }
      // Vertices are not exported as refs yet (see `namingOf`), so a claim on one is not recorded.
    };

    if (outF.Contains(sub) || outE.Contains(sub)) {
      record(sub);  // identity: the very same shape survived into the result
      return;       // it cannot also be its own modification
    }
    try {
      for (TopTools_ListOfShape::Iterator it(maker.Modified(sub)); it.More(); it.Next()) {
        record(it.Value());
      }
    } catch (const Standard_Failure&) {
      // Some makers throw rather than return an empty list for a sub-shape they do not know. That is
      // not an error — it is an absence of history, and REL_ADJACENT is the answer to it.
    }
    try {
      for (TopTools_ListOfShape::Iterator it(maker.Generated(sub)); it.More(); it.Next()) {
        record(it.Value());
      }
    } catch (const Standard_Failure&) {
    }
  }

  void claimAll() {
    for (std::size_t o = 0; o < operands.size(); ++o) {
      const ShapeEntry& e = *operands[o];
      TopTools_IndexedMapOfShape f, ed;
      TopExp::MapShapes(e.shape, TopAbs_FACE, f);
      TopExp::MapShapes(e.shape, TopAbs_EDGE, ed);
      for (std::size_t c = 0; c < e.faceOcct.size(); ++c) {
        claim(static_cast<int>(o), KIND_FACE, static_cast<int>(c), f(e.faceOcct[c]));
      }
      for (std::size_t c = 0; c < e.edgeOcct.size(); ++c) {
        claim(static_cast<int>(o), KIND_EDGE, static_cast<int>(c), ed(e.edgeOcct[c]));
      }
    }
  }

  // How many outputs of this kind does one operand sub-shape produce? (1 => INHERIT; >1 => a SPLIT,
  // and every child needs an occurrence index.)
  int fanOut(const std::map<int, std::vector<std::array<int, 3>>>& src,
             const std::array<int, 3>& of) const {
    int n = 0;
    for (const auto& [out, srcs] : src) {
      (void)out;
      if (std::find(srcs.begin(), srcs.end(), of) != srcs.end()) ++n;
    }
    return n;
  }

  // The DISTINCT output faces bounding a sub-shape, as OCCT indices. A seam edge is bounded by the
  // same face twice; that duplicate is dropped here, which is exactly why a seam cannot be named this
  // way and must come from history or from the primitive's own accessors.
  std::vector<int> boundingFaces(const TopoDS_Shape& sub,
                                 const TopTools_IndexedDataMapOfShapeListOfShape& anc) const {
    std::vector<int> out;
    const int at = anc.FindIndex(sub);
    if (at == 0) return out;
    for (TopTools_ListOfShape::Iterator it(anc.FindFromIndex(at)); it.More(); it.Next()) {
      const int fi = outF.FindIndex(it.Value());
      if (fi != 0 && std::find(out.begin(), out.end(), fi) == out.end()) out.push_back(fi);
    }
    std::sort(out.begin(), out.end());
    return out;
  }
};

// A total, structural order on a derivation. Identities are assigned only AFTER this sort, so OCCT's
// traversal order can never leak into a name (spec §4.5, D8).
bool rowLess(const NameRow& l, const NameRow& r) {
  if (l.relation != r.relation) return l.relation < r.relation;
  if (l.role != r.role) return l.role < r.role;
  if (l.srcOperand != r.srcOperand) return l.srcOperand < r.srcOperand;
  if (l.srcKind != r.srcKind) return l.srcKind < r.srcKind;
  if (l.srcIndex != r.srcIndex) return l.srcIndex < r.srcIndex;
  if (l.viaA != r.viaA) return l.viaA < r.viaA;
  return l.viaB < r.viaB;
}

bool sameDerivation(const NameRow& l, const NameRow& r) {
  return l.relation == r.relation && l.role == r.role && l.srcOperand == r.srcOperand &&
         l.srcKind == r.srcKind && l.srcIndex == r.srcIndex && l.viaA == r.viaA && l.viaB == r.viaB;
}

}  // namespace

std::string lastError() { return g_lastError; }

namespace {

// ---------------------------------------------------------------------------------------------
// Name a DERIVED shape (a boolean, a fillet) from its operands and its maker.
// Returns false — loudly — if any face or edge cannot be accounted for structurally.
// ---------------------------------------------------------------------------------------------
bool nameDerived(const std::vector<const ShapeEntry*>& operands, BRepBuilderAPI_MakeShape& maker,
                 ShapeEntry& out) {
  Resolver r(operands, maker, out.shape);
  r.claimAll();

  // ---- FACES ----------------------------------------------------------------------------------
  // Faces first, and unconditionally: everything below is named in terms of them. Measured on every
  // case: history accounts for 100% of output faces. If that ever stops being true, the right answer
  // is to fail here rather than to invent a face name and poison every edge that touches it.
  std::vector<std::pair<NameRow, int>> faces;  // row + OCCT index
  for (int i = 1; i <= r.outF.Extent(); ++i) {
    NameRow row = blankRow();
    const auto found = r.faceSrc.find(i);
    if (found == r.faceSrc.end()) {
      g_lastError =
          "UNRESOLVED_SUBSHAPE_REF: a face of the result has no ancestor in the operation's history "
          "— it cannot be named without guessing, so the operation is refused";
      return false;
    }
    auto srcs = found->second;
    std::sort(srcs.begin(), srcs.end());
    srcs.erase(std::unique(srcs.begin(), srcs.end()), srcs.end());

    // One ancestor, of the SAME KIND, and this face is its only child ⇒ it IS that face still. Keep
    // its token. ⚠ The kind check is not pedantry: a face can *generate* an edge, so without it a
    // single-ancestor edge could inherit a FACE's token and claim to be a face.
    row.relation = (srcs.size() == 1 && srcs[0][1] == KIND_FACE && r.fanOut(r.faceSrc, srcs[0]) == 1)
                       ? REL_INHERIT
                       : REL_DERIVE;
    for (const auto& s : srcs) {
      row.srcOperand.push_back(s[0]);
      row.srcKind.push_back(s[1]);
      row.srcIndex.push_back(s[2]);
    }
    faces.emplace_back(row, i);
  }

  // The canonical re-sort, then the occurrence index for siblings that share a derivation.
  std::sort(faces.begin(), faces.end(),
            [](const auto& l, const auto& r2) { return rowLess(l.first, r2.first); });
  for (std::size_t i = 0; i < faces.size(); ++i) {
    if (i > 0 && sameDerivation(faces[i].first, faces[i - 1].first)) {
      // ⚠ Two faces with an IDENTICAL derivation. Structure cannot tell them apart, and the spec's
      // only sanctioned tie-break left is a positional key (§4.5) — geometry on the identity path.
      // The probe found no such case in any boolean or fillet we measured, so rather than ship an
      // untested geometric fallback, we refuse and say so. If a real model ever hits this, that is
      // the signal to implement the bounded positional key deliberately — not to have it fire by
      // accident on a case nobody looked at.
      g_lastError =
          "UNRESOLVED_SUBSHAPE_REF: two faces of the result share an identical derivation and cannot "
          "be told apart structurally";
      return false;
    }
    out.faces.push_back(faces[i].first);
    out.faceOcct.push_back(faces[i].second);
  }

  // Canonical face index, by OCCT index — needed to name edges by the faces that bound them.
  std::map<int, int> canonOfFace;
  for (std::size_t c = 0; c < out.faceOcct.size(); ++c) {
    canonOfFace[out.faceOcct[c]] = static_cast<int>(c);
  }

  // ---- VERTICES (internal) ---------------------------------------------------------------------
  // Not exported as refs yet, but needed as a tie-break: when two edges lie between the SAME pair of
  // faces, the vertices they run between separate them. A vertex's structural signature is the set of
  // canonical faces meeting at it. Measured: on the hardest case (a fillet on a boolean edge) exactly
  // two edges needed this, and it separated them — so naming stays 100% structural, with no geometry.
  std::map<int, std::vector<int>> vertexSig;
  for (int i = 1; i <= r.outV.Extent(); ++i) {
    std::vector<int> sig;
    for (const int f : r.boundingFaces(r.outV(i), r.vertFaces)) {
      const auto at = canonOfFace.find(f);
      if (at != canonOfFace.end()) sig.push_back(at->second);
    }
    std::sort(sig.begin(), sig.end());
    vertexSig[i] = sig;
  }

  // ---- EDGES -----------------------------------------------------------------------------------
  std::vector<std::pair<NameRow, int>> edges;
  std::vector<std::vector<int>> endpointSig;  // parallel to `edges`, for the tie-break
  for (int i = 1; i <= r.outE.Extent(); ++i) {
    const TopoDS_Edge& e = TopoDS::Edge(r.outE(i));
    if (BRep_Tool::Degenerated(e)) continue;  // a degenerate edge has no length and names nothing

    NameRow row = blankRow();
    const auto found = r.edgeSrc.find(i);
    if (found != r.edgeSrc.end()) {
      auto srcs = found->second;
      std::sort(srcs.begin(), srcs.end());
      srcs.erase(std::unique(srcs.begin(), srcs.end()), srcs.end());
      // Same rule, same reason: only an EDGE ancestor can hand an edge its token. A section edge is
      // `Generated` by the two FACES that cut through each other, and it must never be mistaken for
      // one of them.
      row.relation =
          (srcs.size() == 1 && srcs[0][1] == KIND_EDGE && r.fanOut(r.edgeSrc, srcs[0]) == 1)
              ? REL_INHERIT
              : REL_DERIVE;
      for (const auto& s : srcs) {
        row.srcOperand.push_back(s[0]);
        row.srcKind.push_back(s[1]);
        row.srcIndex.push_back(s[2]);
      }
    } else {
      // No history. Measured: this is the fillet rebuilding the edges around what it touched. Name it
      // by the two faces that bound it — both of which are named, so the name is structural.
      const std::vector<int> bounding = r.boundingFaces(e, r.edgeFaces);
      if (bounding.size() != 2) {
        // One face ⇒ a seam (the face closes on itself). A seam has no face PAIR, so only history or
        // the primitive's own accessors can name it. Neither did. Refuse.
        g_lastError =
            "UNRESOLVED_SUBSHAPE_REF: an edge of the result has no history and is not bounded by "
            "exactly two named faces — it cannot be named without guessing";
        return false;
      }
      row.relation = REL_ADJACENT;
      row.viaA = canonOfFace.at(bounding[0]);
      row.viaB = canonOfFace.at(bounding[1]);
    }

    TopoDS_Vertex v1, v2;
    TopExp::Vertices(e, v1, v2);
    std::vector<int> sig;
    for (const TopoDS_Vertex& v : {v1, v2}) {
      if (v.IsNull()) continue;
      const int vi = r.outV.FindIndex(v);
      if (vi == 0) continue;
      const std::vector<int>& s = vertexSig[vi];
      sig.insert(sig.end(), s.begin(), s.end());
      sig.push_back(-1);  // a separator, so two endpoints' signatures cannot run together
    }
    std::sort(sig.begin(), sig.end());

    edges.emplace_back(row, i);
    endpointSig.push_back(sig);
  }

  // Sort canonically, carrying the tie-break signature along.
  std::vector<std::size_t> order(edges.size());
  for (std::size_t i = 0; i < order.size(); ++i) order[i] = i;
  std::sort(order.begin(), order.end(), [&](std::size_t l, std::size_t r2) {
    if (!sameDerivation(edges[l].first, edges[r2].first)) {
      return rowLess(edges[l].first, edges[r2].first);
    }
    return endpointSig[l] < endpointSig[r2];  // the structural tie-break, not a coordinate
  });

  for (std::size_t k = 0; k < order.size(); ++k) {
    NameRow row = edges[order[k]].first;
    if (k > 0 && sameDerivation(row, edges[order[k - 1]].first)) {
      if (endpointSig[order[k]] == endpointSig[order[k - 1]]) {
        g_lastError =
            "UNRESOLVED_SUBSHAPE_REF: two edges of the result share a derivation AND the same "
            "endpoints — they cannot be told apart structurally";
        return false;
      }
      row.rank = out.edges.back().rank + 1;  // same derivation, next occurrence
    }
    out.edges.push_back(row);
    out.edgeOcct.push_back(edges[order[k]].second);
  }
  return true;
}

// Name the edges of a PRIMITIVE by the pair of faces that generate them. The faces were named by the
// operation itself; an edge is the intersection of two of them, so its name follows for free. This is
// the rule the box has always used, and it is now just one branch of the general resolver.
//
// `seeded` carries any edge the primitive names ITSELF (a cylinder's seam — bounded by one face
// twice, so no face pair exists and only the operation can name it).
bool namePrimitiveEdges(ShapeEntry& entry, const std::map<int, std::string>& seeded) {
  TopTools_IndexedMapOfShape faceMap, edgeMap;
  TopExp::MapShapes(entry.shape, TopAbs_FACE, faceMap);
  TopExp::MapShapes(entry.shape, TopAbs_EDGE, edgeMap);

  std::map<int, int> canonOfFace;
  for (std::size_t c = 0; c < entry.faceOcct.size(); ++c) {
    canonOfFace[entry.faceOcct[c]] = static_cast<int>(c);
  }

  TopTools_IndexedDataMapOfShapeListOfShape edgeFaces;
  TopExp::MapShapesAndAncestors(entry.shape, TopAbs_EDGE, TopAbs_FACE, edgeFaces);

  std::vector<std::pair<NameRow, int>> rows;
  for (int i = 1; i <= edgeMap.Extent(); ++i) {
    const TopoDS_Edge& edge = TopoDS::Edge(edgeMap(i));
    if (BRep_Tool::Degenerated(edge)) continue;

    NameRow row = blankRow();
    const auto seed = seeded.find(i);
    if (seed != seeded.end()) {
      row.relation = REL_PRIMITIVE;
      row.role = seed->second;
    } else {
      std::vector<int> ranks;
      const int at = edgeFaces.FindIndex(edge);
      if (at == 0) return false;
      for (TopTools_ListOfShape::Iterator it(edgeFaces.FindFromIndex(at)); it.More(); it.Next()) {
        const auto found = canonOfFace.find(faceMap.FindIndex(it.Value()));
        if (found == canonOfFace.end()) return false;
        if (std::find(ranks.begin(), ranks.end(), found->second) == ranks.end()) {
          ranks.push_back(found->second);
        }
      }
      // Exactly two distinct named faces, or we do not name it. A seam reaches here only if the
      // primitive forgot to seed it — which is a bug in the primitive, and it fails loudly.
      if (ranks.size() != 2) return false;
      std::sort(ranks.begin(), ranks.end());
      row.relation = REL_ADJACENT;
      row.viaA = ranks[0];
      row.viaB = ranks[1];
    }
    rows.emplace_back(row, i);
  }

  std::sort(rows.begin(), rows.end(),
            [](const auto& l, const auto& r) { return rowLess(l.first, r.first); });
  for (std::size_t i = 0; i < rows.size(); ++i) {
    // A primitive's edges are a bijection over its face pairs. Two edges sharing one would be a
    // defect in the primitive's own naming — not something to paper over with an occurrence index.
    if (i > 0 && sameDerivation(rows[i].first, rows[i - 1].first)) return false;
    entry.edges.push_back(rows[i].first);
    entry.edgeOcct.push_back(rows[i].second);
  }
  return true;
}

// Register a finished shape and hand back its handle.
int store(ShapeEntry& entry) {
  const int handle = g_nextHandle++;
  g_shapes[handle] = entry;
  return handle;
}

}  // namespace

// =============================================================================================
// PRIMITIVES — they name their own faces, from their own semantic accessors. Never from coordinates.
// =============================================================================================

int makeBox(double x, double y, double z, double dx, double dy, double dz) {
  g_lastError.clear();
  try {
    if (!(dx > 0) || !(dy > 0) || !(dz > 0)) {
      g_lastError = "INVALID_PAYLOAD: dx/dy/dz must be positive and finite";
      return 0;
    }

    // ⚠ The placement is a TRANSLATION and it changes no name. A face is `x-min` because the operation
    // says so, not because of where it ended up — so the same wall, modelled at the origin or at
    // (12000, 4000, 3000), hands out byte-identical refs. That is the naming rule doing its job: if
    // moving a solid could rename its faces, every reference in the project would be a hostage to the
    // site grid.
    BRepPrimAPI_MakeBox mk(gp_Pnt(x, y, z), dx, dy, dz);
    ShapeEntry entry;
    entry.shape = mk.Shape();

    TopTools_IndexedMapOfShape faceMap;
    TopExp::MapShapes(entry.shape, TopAbs_FACE, faceMap);

    // ⚠ THE NAMING RULE (spec §4.5, D1). A face's identity comes from THE OPERATION THAT MADE IT,
    // never from where it ended up in space. So we ASK BRepPrimAPI_MakeBox which face is which —
    // OCCT's own semantic accessors — instead of inspecting coordinates to find "the one at x=0".
    //
    // The difference is invisible on a box at the origin and catastrophic later: a geometric rule
    // silently re-targets every downstream reference the moment the solid is moved, mirrored, or
    // rebuilt with different parameters.
    // ⚠ OCCT's Left/Right/Front/Back do NOT mean what an X/Y/Z-minded reader assumes, and guessing
    // costs you four silently mislabelled faces. MEASURED against OCCT 7.9.3, not remembered:
    //
    //     BackFace()  = x-min      FrontFace() = x-max
    //     LeftFace()  = y-min      RightFace() = y-max
    //     BottomFace()= z-min      TopFace()   = z-max
    //
    // `occt-kernel.test.ts` re-measures this on every run ("role labels are honest"), because a wrong
    // entry here is invisible — the geometry is perfect and only the NAMES are lies.
    const char* const roles[6] = {"x-min", "x-max", "y-min", "y-max", "z-min", "z-max"};
    const TopoDS_Face* const occtFaces[6] = {
        &mk.BackFace(),    // x-min
        &mk.FrontFace(),   // x-max
        &mk.LeftFace(),    // y-min
        &mk.RightFace(),   // y-max
        &mk.BottomFace(),  // z-min
        &mk.TopFace(),     // z-max
    };
    for (int c = 0; c < 6; ++c) {
      const int index = faceMap.FindIndex(*occtFaces[c]);
      if (index == 0) {
        g_lastError = "OCCT_STANDARD_FAILURE: a box face could not be resolved to its role";
        return 0;
      }
      NameRow row = blankRow();
      row.relation = REL_PRIMITIVE;
      row.role = roles[c];
      entry.faces.push_back(row);
      entry.faceOcct.push_back(index);
    }

    // A box has no seam, so it seeds nothing: all 12 edges fall out of the face pairs.
    if (!namePrimitiveEdges(entry, {})) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: box edges could not be named structurally";
      return 0;
    }
    return store(entry);
  } catch (const Standard_Failure& e) {
    // OCCT failures are marshalled, never thrown across the boundary (spec §6.4 / D10).
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
    // Emscripten can surface an OCCT failure as a bare integer, not an Error — a naive
    // `catch (const std::exception&)` would drop it on the floor.
    g_lastError = "OCCT_STANDARD_FAILURE: non-standard throw";
    return 0;
  }
}

// The circular column — and the first shape whose edges the face-pair rule alone cannot name.
//
// ⚠ A FULL CYLINDER HAS A SEAM. Its lateral surface closes on itself, so the seam edge is bounded by
// ONE face (the lateral face, on both sides) rather than two. Measured, not assumed: the probe found
// exactly one such edge, and the old face-pair-only kernel would have REFUSED to build a cylinder at
// all. The operation names the seam itself — BRepPrim_Cylinder hands it to us — which is the same
// rule as everywhere else: identity comes from the operation.
int makeCylinder(double x, double y, double z, double ax, double ay, double az, double radius,
                 double height) {
  g_lastError.clear();
  try {
    if (!(radius > 0) || !(height > 0)) {
      g_lastError = "INVALID_PAYLOAD: radius and height must be positive and finite";
      return 0;
    }
    if (ax * ax + ay * ay + az * az <= 0) {
      g_lastError = "INVALID_PAYLOAD: the cylinder's axis must be a non-zero direction";
      return 0;
    }

    // A column stands up (+Z); a duct penetration goes sideways through a wall. Same primitive, and
    // the axis is what tells them apart — so `z-min`/`z-max` name the caps in the CYLINDER's own frame,
    // not the world's. (Naming from the operation, again: a duct's "z-max" cap is the one at the far
    // end of its axis, wherever that points.)
    BRepPrimAPI_MakeCylinder mk(gp_Ax2(gp_Pnt(x, y, z), gp_Dir(ax, ay, az)), radius, height);
    ShapeEntry entry;
    entry.shape = mk.Shape();

    TopTools_IndexedMapOfShape faceMap, edgeMap;
    TopExp::MapShapes(entry.shape, TopAbs_FACE, faceMap);
    TopExp::MapShapes(entry.shape, TopAbs_EDGE, edgeMap);

    BRepPrim_Cylinder& cyl = mk.Cylinder();
    const char* const roles[3] = {"lateral", "z-min", "z-max"};
    const TopoDS_Face* const occtFaces[3] = {&cyl.LateralFace(), &cyl.BottomFace(), &cyl.TopFace()};
    for (int c = 0; c < 3; ++c) {
      const int index = faceMap.FindIndex(*occtFaces[c]);
      if (index == 0) {
        g_lastError = "OCCT_STANDARD_FAILURE: a cylinder face could not be resolved to its role";
        return 0;
      }
      NameRow row = blankRow();
      row.relation = REL_PRIMITIVE;
      row.role = roles[c];
      entry.faces.push_back(row);
      entry.faceOcct.push_back(index);
    }

    // The seam — the one edge no face pair can name. The caps' circular edges are left to the
    // face-pair rule, which names them `lateral|z-min` and `lateral|z-max` exactly as it would for
    // any two adjoining faces.
    std::map<int, std::string> seeded;
    const int seam = edgeMap.FindIndex(cyl.StartEdge());
    if (seam == 0) {
      g_lastError = "OCCT_STANDARD_FAILURE: the cylinder's seam edge could not be resolved";
      return 0;
    }
    seeded[seam] = "lateral.seam";

    if (!namePrimitiveEdges(entry, seeded)) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: cylinder edges could not be named structurally";
      return 0;
    }
    return store(entry);
  } catch (const Standard_Failure& e) {
    // OCCT failures are marshalled, never thrown across the boundary (spec §6.4 / D10).
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
    // Emscripten can surface an OCCT failure as a bare integer, not an Error — a naive
    // `catch (const std::exception&)` would drop it on the floor.
    g_lastError = "OCCT_STANDARD_FAILURE: non-standard throw";
    return 0;
  }
}

// =============================================================================================
// DERIVED OPERATIONS — they name nothing themselves; the resolver names their output from history.
// =============================================================================================

// kind: 0 = cut (A minus B), 1 = fuse, 2 = common.
int booleanOp(int handleA, int handleB, int kind) {
  g_lastError.clear();
  try {
    const ShapeEntry* a = lookup(handleA);
    const ShapeEntry* b = lookup(handleB);
    if (a == nullptr || b == nullptr) {
      g_lastError = "HANDLE_NOT_FOUND: a boolean operand is not a live shape";
      return 0;
    }
    if (kind < 0 || kind > 2) {
      g_lastError = "INVALID_PAYLOAD: unknown boolean kind";
      return 0;
    }

    TopTools_ListOfShape args, tools;
    args.Append(a->shape);
    tools.Append(b->shape);

    BRepAlgoAPI_Cut cut;
    BRepAlgoAPI_Fuse fuse;
    BRepAlgoAPI_Common common;
    BRepAlgoAPI_BooleanOperation* op =
        kind == 0 ? static_cast<BRepAlgoAPI_BooleanOperation*>(&cut)
                  : (kind == 1 ? static_cast<BRepAlgoAPI_BooleanOperation*>(&fuse)
                               : static_cast<BRepAlgoAPI_BooleanOperation*>(&common));
    op->SetArguments(args);
    op->SetTools(tools);
    op->Build();
    if (!op->IsDone()) {
      g_lastError = "OCCT_STANDARD_FAILURE: the boolean operation did not complete";
      return 0;
    }

    ShapeEntry entry;
    entry.shape = op->Shape();

    // A boolean that removes everything (or that never touched anything) is almost always a modelling
    // mistake — a tool that misses its target, an opening bigger than its wall. The protocol has a
    // code for it precisely so the UI can say so rather than silently show nothing.
    TopTools_IndexedMapOfShape solids;
    TopExp::MapShapes(entry.shape, TopAbs_SOLID, solids);
    if (solids.Extent() == 0) {
      g_lastError = "EMPTY_BOOLEAN_RESULT: the operation produced no solid";
      return 0;
    }

    entry.operands = {handleA, handleB};
    const std::vector<const ShapeEntry*> operands{a, b};
    if (!nameDerived(operands, *op, entry)) return 0;  // g_lastError already says why
    return store(entry);
  } catch (const Standard_Failure& e) {
    // OCCT failures are marshalled, never thrown across the boundary (spec §6.4 / D10).
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
    // Emscripten can surface an OCCT failure as a bare integer, not an Error — a naive
    // `catch (const std::exception&)` would drop it on the floor.
    g_lastError = "OCCT_STANDARD_FAILURE: non-standard throw";
    return 0;
  }
}

// Round an edge — addressed BY ITS CANONICAL INDEX, i.e. by its identity, never by its position.
//
// ⚠ This is the operation the spec calls the resolver's hardest case, because the edge being filleted
// is usually one a boolean created. Measured on exactly that case: the fillet face comes back as
// `Generated` from the target edge (so it is named from the edge it rounds), while the edges and
// vertices AROUND it are rebuilt with no history at all — those are named by adjacency instead. Both
// halves are needed; neither alone suffices.
int fillet(int handle, int edgeIndex, double radius) {
  g_lastError.clear();
  try {
    const ShapeEntry* src = lookup(handle);
    if (src == nullptr) {
      g_lastError = "HANDLE_NOT_FOUND: no live shape for the fillet's target";
      return 0;
    }
    if (!(radius > 0)) {
      g_lastError = "INVALID_PAYLOAD: the fillet radius must be positive and finite";
      return 0;
    }
    if (edgeIndex < 0 || edgeIndex >= static_cast<int>(src->edgeOcct.size())) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: the edge to fillet is not a named edge of this shape";
      return 0;
    }

    TopTools_IndexedMapOfShape edgeMap;
    TopExp::MapShapes(src->shape, TopAbs_EDGE, edgeMap);

    BRepFilletAPI_MakeFillet mk(src->shape);
    mk.Add(radius, TopoDS::Edge(edgeMap(src->edgeOcct[static_cast<std::size_t>(edgeIndex)])));
    mk.Build();
    if (!mk.IsDone()) {
      // Overwhelmingly the cause is a radius the geometry cannot accept (wider than the face it must
      // fit on). The protocol has a dedicated code so the UI can say "too large" instead of "failed".
      g_lastError = "FILLET_RADIUS_TOO_LARGE: the fillet could not be built at this radius";
      return 0;
    }

    ShapeEntry entry;
    entry.shape = mk.Shape();
    entry.operands = {handle};
    const std::vector<const ShapeEntry*> operands{src};
    if (!nameDerived(operands, mk, entry)) return 0;
    return store(entry);
  } catch (const Standard_Failure& e) {
    // OCCT failures are marshalled, never thrown across the boundary (spec §6.4 / D10).
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
    // Emscripten can surface an OCCT failure as a bare integer, not an Error — a naive
    // `catch (const std::exception&)` would drop it on the floor.
    g_lastError = "OCCT_STANDARD_FAILURE: non-standard throw";
    return 0;
  }
}

// =============================================================================================
// READ-ONLY OPS — naming, quantities, geometry queries, tessellation.
// =============================================================================================

Naming getNaming(int handle) {
  Naming n;
  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return n;
  }
  n.faces = entry->faces;
  n.edges = entry->edges;
  n.operands = entry->operands;
  return n;
}

Bounds getBounds(int handle) {
  Bounds b{0, 0, 0, 0, 0, 0};
  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return b;
  }
  Bnd_Box box;
  BRepBndLib::Add(entry->shape, box);

  // ⚠ OCCT's bounding box is TOLERANT, not tight: BRepBndLib enlarges it by the shape's tolerance
  // (~1e-7 mm), and `Get` then returns min-gap / max+gap. So a box sitting exactly on the origin
  // reports xMin = -1e-7. The spec asks for the tight box (it is compared against exact goldens, and
  // it is what the viewport frames), so drop the gap. Caught by the golden harness — our misreading of
  // an OCCT API, which is exactly the class of bug it exists to find (spec §9.0).
  box.SetGap(0.0);
  box.Get(b.xMin, b.yMin, b.zMin, b.xMax, b.yMax, b.zMax);
  return b;
}

// THE GEOMETRIC QUERIES (decision D23). An agent must be able to ask spatial questions — "what are the
// tight bounds of this element?", "what is within 2 m of this column?", "is this point inside that
// wall?" — and those questions read the B-Rep, so they are kernel ops and they had to land before the
// protocol freezes at the end of P3.
//
// ⚠ THEY RETURN SEMANTICS, NEVER TRIANGLES, and they are answered from the B-Rep, never from the mesh.
// A tessellated column is smaller than the real one by its chord error; an agent that reasoned about
// clearances from the mesh would confidently under-report every clash in the project.

// The tight bounds of a whole shape (kind < 0) or of one NAMED sub-shape of it (a face, an edge) —
// addressed by canonical index, which is to say BY ITS IDENTITY.
Bounds subShapeBounds(int handle, int kind, int index) {
  Bounds b{0, 0, 0, 0, 0, 0};
  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return b;
  }
  if (kind < 0) return getBounds(handle);

  const std::vector<int>& map = kind == KIND_FACE ? entry->faceOcct : entry->edgeOcct;
  if (index < 0 || index >= static_cast<int>(map.size())) {
    g_lastError = "UNRESOLVED_SUBSHAPE_REF: no such named sub-shape on this shape";
    return b;
  }
  TopTools_IndexedMapOfShape shapes;
  TopExp::MapShapes(entry->shape, kind == KIND_FACE ? TopAbs_FACE : TopAbs_EDGE, shapes);

  Bnd_Box box;
  BRepBndLib::Add(shapes(map[static_cast<std::size_t>(index)]), box);
  box.SetGap(0.0);
  box.Get(b.xMin, b.yMin, b.zMin, b.xMax, b.yMax, b.zMax);
  return b;
}

// The minimum distance between two shapes, with the two points that realise it. Distance 0 means they
// touch or overlap — which is what makes this the clash-detection primitive as well as the
// "what is near this column" primitive.
Proximity distanceBetween(int handleA, int handleB) {
  Proximity p{-1, 0, 0, 0, 0, 0, 0};
  const ShapeEntry* a = lookup(handleA);
  const ShapeEntry* b = lookup(handleB);
  if (a == nullptr || b == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return p;
  }
  try {
    BRepExtrema_DistShapeShape ext(a->shape, b->shape);
    ext.Perform();
    if (!ext.IsDone() || ext.NbSolution() < 1) {
      g_lastError = "OCCT_STANDARD_FAILURE: the distance query did not converge";
      return p;
    }
    p.distance = ext.Value();
    const gp_Pnt pa = ext.PointOnShape1(1);
    const gp_Pnt pb = ext.PointOnShape2(1);
    p.ax = pa.X(); p.ay = pa.Y(); p.az = pa.Z();
    p.bx = pb.X(); p.by = pb.Y(); p.bz = pb.Z();
    return p;
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return p;
  }
}

// Containment: 0 = outside, 1 = inside, 2 = on the boundary, -1 = failed.
int classifyPoint(int handle, double x, double y, double z, double tolerance) {
  g_lastError.clear();
  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return -1;
  }
  try {
    BRepClass3d_SolidClassifier classifier(entry->shape);
    classifier.Perform(gp_Pnt(x, y, z), tolerance > 0 ? tolerance : 1e-7);
    switch (classifier.State()) {
      case TopAbs_IN: return 1;
      case TopAbs_ON: return 2;
      case TopAbs_OUT: return 0;
      default:
        g_lastError = "OCCT_STANDARD_FAILURE: the point could not be classified";
        return -1;
    }
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return -1;
  }
}

Measure measure(int handle) {
  Measure m{0, 0, 0, 0, 0, 0, 0};
  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return m;
  }
  const TopoDS_Shape& s = entry->shape;
  try {
    GProp_GProps vol;
    BRepGProp::VolumeProperties(s, vol);
    m.volume = vol.Mass();

    GProp_GProps surf;
    BRepGProp::SurfaceProperties(s, surf);
    m.area = surf.Mass();

    // Edge length is summed over UNIQUE edges, deliberately.
    //
    // Calling BRepGProp::LinearProperties on a *solid* sums every edge once per adjoining face, so a
    // box reports 45,600 mm for edges that total 22,800 mm. That exact bug was caught by the
    // closed-form check when the goldens were first seeded (current_state.md §4a(2)) — it is OUR
    // misuse of OCCT's API, not an OCCT defect, and it is the reason the closed-form tier exists.
    TopTools_IndexedMapOfShape edgeMap;
    TopExp::MapShapes(s, TopAbs_EDGE, edgeMap);
    double total = 0.0;
    for (int i = 1; i <= edgeMap.Extent(); ++i) {
      const TopoDS_Edge& e = TopoDS::Edge(edgeMap(i));
      if (BRep_Tool::Degenerated(e)) continue;
      BRepAdaptor_Curve curve(e);
      total += GCPnts_AbscissaPoint::Length(curve);
    }
    m.edgeLength = total;

    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(s, TopAbs_SOLID, map);   m.solids = map.Extent();   map.Clear();
    TopExp::MapShapes(s, TopAbs_FACE, map);    m.faces = map.Extent();    map.Clear();
    TopExp::MapShapes(s, TopAbs_EDGE, map);    m.edges = map.Extent();    map.Clear();
    TopExp::MapShapes(s, TopAbs_VERTEX, map);  m.vertices = map.Extent();
    return m;
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return m;
  }
}

// Returns an object of zero-copy typed-array views onto `g_mesh` (see the note there), plus an
// `ok` flag. On failure `ok` is false and `lastError()` explains — never a throw across the boundary.
emscripten::val tessellate(int handle, double deflection) {
  using emscripten::val;

  g_mesh = Mesh();
  Mesh& mesh = g_mesh;

  const auto view = [](const auto& v) {
    return val(emscripten::typed_memory_view(v.size(), v.data()));
  };
  const auto result = [&](bool ok) {
    val out = val::object();
    out.set("ok", ok);
    out.set("positions", view(mesh.positions));
    out.set("normals", view(mesh.normals));
    out.set("indices", view(mesh.indices));
    out.set("triangleFace", view(mesh.triangleFace));
    out.set("edgePositions", view(mesh.edgePositions));
    out.set("edgeIndex", view(mesh.edgeIndex));
    out.set("edgeStart", view(mesh.edgeStart));
    out.set("edgeCount", view(mesh.edgeCount));
    return out;
  };

  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return result(false);
  }
  try {
    BRepMesh_IncrementalMesh mesher(entry->shape, deflection);
    mesher.Perform();

    TopTools_IndexedMapOfShape faceMap, edgeMap;
    TopExp::MapShapes(entry->shape, TopAbs_FACE, faceMap);
    TopExp::MapShapes(entry->shape, TopAbs_EDGE, edgeMap);

    // Faces are walked in CANONICAL order, so a triangle's face index means the same thing on every
    // machine and every build. It must not be an accident of how OCCT happened to traverse the shape.
    for (std::size_t c = 0; c < entry->faceOcct.size(); ++c) {
      const TopoDS_Face& face = TopoDS::Face(faceMap(entry->faceOcct[c]));
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
        int a, b, c2;
        tri->Triangle(i).Get(a, b, c2);
        if (reversed) std::swap(b, c2);
        mesh.indices.push_back(base + a - 1);
        mesh.indices.push_back(base + b - 1);
        mesh.indices.push_back(base + c2 - 1);
        mesh.triangleFace.push_back(static_cast<int>(c));
      }
    }

    // The wireframe. Edges are pickable and drawable, so they need geometry AND identity — an edge
    // polyline carries the canonical index of the edge it draws, exactly as a triangle carries its
    // face's. Read from the SAME triangulation the faces used, so wireframe and shading agree.
    for (std::size_t c = 0; c < entry->edgeOcct.size(); ++c) {
      const TopoDS_Edge& edge = TopoDS::Edge(edgeMap(entry->edgeOcct[c]));
      const int start = static_cast<int>(mesh.edgePositions.size() / 3);
      int count = 0;

      const auto push = [&mesh, &count](const gp_Pnt& p) {
        mesh.edgePositions.push_back(static_cast<float>(p.X()));
        mesh.edgePositions.push_back(static_cast<float>(p.Y()));
        mesh.edgePositions.push_back(static_cast<float>(p.Z()));
        ++count;
      };

      Handle(Poly_PolygonOnTriangulation) poly;
      Handle(Poly_Triangulation) tri;
      TopLoc_Location loc;
      BRep_Tool::PolygonOnTriangulation(edge, poly, tri, loc);

      if (!poly.IsNull() && !tri.IsNull()) {
        const gp_Trsf& trsf = loc.Transformation();
        const TColStd_Array1OfInteger& nodes = poly->Nodes();
        for (int i = nodes.Lower(); i <= nodes.Upper(); ++i) {
          push(tri->Node(nodes(i)).Transformed(trsf));
        }
      } else {
        // No polygon on the triangulation (a straight edge OCCT saw no need to discretise). The two
        // vertices ARE the exact polyline in that case.
        TopoDS_Vertex v1, v2;
        TopExp::Vertices(edge, v1, v2);
        if (!v1.IsNull()) push(BRep_Tool::Pnt(v1));
        if (!v2.IsNull()) push(BRep_Tool::Pnt(v2));
      }

      if (count == 0) continue;
      mesh.edgeIndex.push_back(static_cast<int>(c));
      mesh.edgeStart.push_back(start);
      mesh.edgeCount.push_back(count);
    }

    return result(true);
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return result(false);
  }
}

bool releaseShape(int handle) { return g_shapes.erase(handle) > 0; }
int liveHandles() { return static_cast<int>(g_shapes.size()); }

EMSCRIPTEN_BINDINGS(bunyan_kernel) {
  using namespace emscripten;

  register_vector<int>("VectorInt");
  register_vector<NameRow>("VectorNameRow");

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

  value_object<Proximity>("Proximity")
      .field("distance", &Proximity::distance)
      .field("ax", &Proximity::ax).field("ay", &Proximity::ay).field("az", &Proximity::az)
      .field("bx", &Proximity::bx).field("by", &Proximity::by).field("bz", &Proximity::bz);

  // The naming contract, crossing the boundary as pure structure. TypeScript turns it into identity.
  value_object<NameRow>("NameRow")
      .field("relation", &NameRow::relation)
      .field("role", &NameRow::role)
      .field("rank", &NameRow::rank)
      .field("srcOperand", &NameRow::srcOperand)
      .field("srcKind", &NameRow::srcKind)
      .field("srcIndex", &NameRow::srcIndex)
      .field("viaA", &NameRow::viaA)
      .field("viaB", &NameRow::viaB);

  value_object<Naming>("Naming")
      .field("faces", &Naming::faces)
      .field("edges", &Naming::edges)
      .field("operands", &Naming::operands);

  // NOTE there is no value_object<Mesh>: `tessellate` returns typed-array VIEWS onto the mesh buffers
  // rather than embind vectors, because an embind vector costs one JS<->WASM crossing per element read
  // (see the note on `g_mesh`). The mesh is the one thing big enough for that to matter.

  function("makeBox", &makeBox);
  function("makeCylinder", &makeCylinder);
  function("booleanOp", &booleanOp);
  function("fillet", &fillet);
  function("getNaming", &getNaming);
  function("getBounds", &getBounds);
  function("subShapeBounds", &subShapeBounds);
  function("distanceBetween", &distanceBetween);
  function("classifyPoint", &classifyPoint);
  function("measure", &measure);
  function("tessellate", &tessellate);
  function("releaseShape", &releaseShape);
  function("liveHandles", &liveHandles);
  function("lastError", &lastError);
}

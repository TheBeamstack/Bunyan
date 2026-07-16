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
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepPrimAPI_MakeRevol.hxx>
#include <BRepPrim_Cylinder.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepAlgoAPI_BooleanOperation.hxx>
#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>
#include <BRepBuilderAPI_MakeShape.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <GC_MakeArcOfCircle.hxx>
#include <Geom_TrimmedCurve.hxx>
#include <TopoDS_Wire.hxx>
#include <gp.hxx>
#include <gp_Pln.hxx>
#include <gp_Ax3.hxx>
#include <gp_Trsf.hxx>
#include <gp_Ax1.hxx>
#include <gp_Vec.hxx>
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
#include <TopAbs_Orientation.hxx>
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
#include <BRepAdaptor_Surface.hxx>
#include <gp_Ax2.hxx>
#include <gp_Pnt.hxx>
#include <gp_Dir.hxx>

#include <algorithm>
#include <cmath>
#include <array>
#include <malloc.h>
#include <map>
#include <sstream>
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

// A face's local frame at its parametric centre: a point on the surface, its OUTWARD normal, and two
// in-plane tangents. Read from the B-Rep surface — never from a bounding box, which for a curved face
// cannot say which way is out. It is what a hosted void needs to cut THROUGH a round column's side.
struct Frame {
  double ox, oy, oz;  // origin: a point ON the surface, at the parametric centre
  double nx, ny, nz;  // OUTWARD unit normal at the origin (orientation-corrected)
  double ux, uy, uz;  // in-plane unit tangent
  double vx, vy, vz;  // in-plane unit tangent, orthogonal to u
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

// ---------------------------------------------------------------------------------------------
// THE BOUNDED POSITIONAL KEY (spec §4.5 + §6.5) — RULED IN by the owner, 2026-07-13 (D28).
//
// ⚠⚠ THIS IS THE ONLY PLACE IN BUNYAN WHERE GEOMETRY TOUCHES THE IDENTITY PATH. Everything else in
// this file is pure topology. Read the four rules before you change a character of it:
//
//   1. IT IS A LAST RESORT, NOT A NAME. It never *identifies* a sub-shape — it only ORDERS two
//      siblings that every structural test has already proven interchangeable (same derivation, same
//      neighbours/endpoints). If structure can separate them, this code never runs.
//   2. IT IS BOUNDED. The centroid is rounded to the **mm grid** — the unit everything is authored in
//      (spec §6.5) — with a FIXED rounding mode, so the key is an integer and the comparison is exact.
//      No tolerance, no epsilon, no FP compare.
//   3. IT IS COMPUTED IN THE ELEMENT'S OWN BUILD FRAME, which is what makes the residual risk small:
//      `transform` is pure INHERIT and mints no identities, so MOVING OR ROTATING a column in the
//      world cannot re-rank anything. Only re-authoring the recipe that places the duct *within* the
//      column can flip the tie — that hazard is real, it is why this needed an owner ruling, and it is
//      the reason the key is bounded rather than free.
//   4. A COLLISION IS A DEFECT, NOT A FALLBACK. If two distinct sub-shapes round to the SAME key, the
//      grid was too coarse for the model, and spec §6.5 is explicit: surface it, never tolerate it.
//      The call sites below REFUSE, exactly as they did before this key existed.
//
// The case that forced it (measured, probe case `cut_round_column_by_duct`): a duct drilled clean
// through a ROUND column. The column's lateral face wraps 360°, so the duct enters and leaves through
// the SAME face — the two rims share a derivation, share both bounding faces, and have identical
// endpoint signatures. Nothing structural separates them. They sit ~one column-diameter apart, so the
// mm grid separates them by hundreds of units.
using PositionalKey = std::array<long long, 3>;

// A fixed rounding mode (spec §6.5): round-half-away-from-zero, the one `llround` guarantees on every
// platform, so the seeded key is reproducible across the two build actors' machines.
long long toGrid(double mm) { return std::llround(mm); }

PositionalKey centroidKey(const TopoDS_Shape& s) {
  GProp_GProps props;
  // A face's centroid is the centroid of its AREA; an edge's is the centroid of its LENGTH. Asking
  // for the wrong one returns a plausible, meaningless point (the same trap `measure` documents).
  if (s.ShapeType() == TopAbs_FACE) {
    BRepGProp::SurfaceProperties(s, props);
  } else {
    BRepGProp::LinearProperties(s, props);
  }
  const gp_Pnt c = props.CentreOfMass();
  return {toGrid(c.X()), toGrid(c.Y()), toGrid(c.Z())};
}

// A derivation, flattened to a comparable key — so that one sub-shape's derivation can appear inside
// ANOTHER's tie-break signature. Deliberately excludes `rank`: rank is what the signature is being
// used to compute, and feeding it back in would be circular.
std::string derivationKey(const NameRow& r) {
  std::ostringstream o;
  o << r.relation << '|' << r.role;
  for (const int v : r.srcOperand) o << '|' << v;
  o << '#';
  for (const int v : r.srcKind) o << '|' << v;
  o << '#';
  for (const int v : r.srcIndex) o << '|' << v;
  return o.str();
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

  // ---- THE FACE TIE-BREAK: WHICH FACES A FACE TOUCHES ------------------------------------------
  //
  // ⚠ WHY THIS EXISTS (and it is the hole Entry 9 left, found by cutting a groove). When a boolean
  // SPLITS one face into two — a chase, a rebate, a shadow gap, a recessed band across a wall — both
  // halves have an IDENTICAL derivation: same parent face, same operand, same relation. History cannot
  // tell them apart, and the kernel used to REFUSE the whole operation, so a wall with a groove in it
  // was unmodellable.
  //
  // But they are not indistinguishable. They touch DIFFERENT faces. MEASURED (probe.cpp case 6b, the
  // `touches` field): the half below the groove meets the wall's z-min face, the half above meets
  // z-max. That is pure topology — no coordinate, no tolerance, nothing that drifts when the wall is
  // resized or the groove is moved.
  //
  // So faces get exactly the tie-break the EDGES have always had (their endpoint signature, below):
  // sort by derivation, then by a structural signature; assign the occurrence index in that order; and
  // refuse ONLY when the derivation AND the signature are both identical. That residue — two faces
  // with the same parent and the same neighbours — is the *genuinely* symmetric split of spec §4.5,
  // and it still refuses, because that is the case where only a positional key (geometry on the
  // identity path) could help. It is still deliberately not implemented.
  //
  // The signature is built from the neighbours' DERIVATIONS, not their canonical indices, precisely to
  // avoid a circularity: canonical indices are what this sort is computing.
  std::map<int, const NameRow*> rowOfFace;  // OCCT face index -> its row
  for (const auto& [row, occt] : faces) rowOfFace[occt] = &row;

  std::map<int, std::vector<int>> faceNeighbours;  // OCCT face index -> OCCT face indices
  for (int e = 1; e <= r.outE.Extent(); ++e) {
    const std::vector<int> bounding = r.boundingFaces(r.outE(e), r.edgeFaces);
    for (const int a : bounding) {
      for (const int b : bounding) {
        if (a != b) faceNeighbours[a].push_back(b);
      }
    }
  }

  std::map<int, std::vector<std::string>> faceSig;  // OCCT face index -> sorted neighbour derivations
  for (const auto& [row, occt] : faces) {
    (void)row;
    std::vector<std::string> sig;
    auto found = faceNeighbours.find(occt);
    if (found != faceNeighbours.end()) {
      std::vector<int> neighbours = found->second;
      std::sort(neighbours.begin(), neighbours.end());
      neighbours.erase(std::unique(neighbours.begin(), neighbours.end()), neighbours.end());
      for (const int n : neighbours) {
        const auto at = rowOfFace.find(n);
        if (at != rowOfFace.end()) sig.push_back(derivationKey(*at->second));
      }
    }
    std::sort(sig.begin(), sig.end());
    faceSig[occt] = sig;
  }

  // The bounded positional key (D28) — computed for every face, but CONSULTED only where structure has
  // already tied. It is the third and last sort key, never the first.
  std::map<int, PositionalKey> facePos;
  for (const auto& [row, occt] : faces) {
    (void)row;
    facePos[occt] = centroidKey(r.outF(occt));
  }

  // The canonical re-sort, then the occurrence index for siblings that share a derivation.
  std::sort(faces.begin(), faces.end(), [&](const auto& l, const auto& r2) {
    if (!sameDerivation(l.first, r2.first)) return rowLess(l.first, r2.first);
    if (faceSig[l.second] != faceSig[r2.second]) {
      return faceSig[l.second] < faceSig[r2.second];  // structural, and it decides almost always
    }
    return facePos[l.second] < facePos[r2.second];  // ⚠ D28: geometry, bounded, last resort only
  });

  for (std::size_t i = 0; i < faces.size(); ++i) {
    NameRow row = faces[i].first;
    if (i > 0 && sameDerivation(row, faces[i - 1].first)) {
      if (faceSig[faces[i].second] == faceSig[faces[i - 1].second] &&
          facePos[faces[i].second] == facePos[faces[i - 1].second]) {
        // ⚠ Same derivation, same neighbours, AND the same millimetre. Two distinct faces cannot
        // occupy one centroid on the mm grid unless the grid is too coarse for this model — which
        // spec §6.5 says is a determinism DEFECT to surface, never something to tolerate. Refuse,
        // exactly as this site did before the key existed.
        g_lastError =
            "UNRESOLVED_SUBSHAPE_REF: two faces of the result share a derivation, the same "
            "neighbouring faces AND the same mm-grid centroid — structure cannot tell them apart and "
            "the positional key collides, so no identity can be assigned";
        return false;
      }
      row.rank = out.faces.back().rank + 1;  // same derivation, next occurrence
    }
    out.faces.push_back(row);
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

  // ⚠ THE CASE D28 WAS RULED IN FOR IS AN EDGE CASE, AND IT IS THIS ONE. The two rims of a duct
  // drilled through a ROUND column reach here with the same derivation and the same endpoint
  // signature — the spec mis-predicted the shape of this case twice (first a mirror, then two faces),
  // and both times measurement corrected it. The key is the third sort term, and only the third.
  std::vector<PositionalKey> edgePos(edges.size());
  for (std::size_t i = 0; i < edges.size(); ++i) {
    edgePos[i] = centroidKey(r.outE(edges[i].second));
  }

  // Sort canonically, carrying the tie-break signature along.
  std::vector<std::size_t> order(edges.size());
  for (std::size_t i = 0; i < order.size(); ++i) order[i] = i;
  std::sort(order.begin(), order.end(), [&](std::size_t l, std::size_t r2) {
    if (!sameDerivation(edges[l].first, edges[r2].first)) {
      return rowLess(edges[l].first, edges[r2].first);
    }
    if (endpointSig[l] != endpointSig[r2]) {
      return endpointSig[l] < endpointSig[r2];  // the structural tie-break, and it decides first
    }
    return edgePos[l] < edgePos[r2];  // ⚠ D28: geometry, bounded, last resort only
  });

  for (std::size_t k = 0; k < order.size(); ++k) {
    NameRow row = edges[order[k]].first;
    if (k > 0 && sameDerivation(row, edges[order[k - 1]].first)) {
      if (endpointSig[order[k]] == endpointSig[order[k - 1]] &&
          edgePos[order[k]] == edgePos[order[k - 1]]) {
        // Same derivation, same endpoints, AND the same millimetre — the grid collided (spec §6.5).
        g_lastError =
            "UNRESOLVED_SUBSHAPE_REF: two edges of the result share a derivation, the same endpoints "
            "AND the same mm-grid centroid — structure cannot tell them apart and the positional key "
            "collides, so no identity can be assigned";
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

// ---------------------------------------------------------------------------------------------
// THE PROFILE — a closed loop of AUTHORED segments in a plane. The substrate of extrude (and revolve).
//
// Flat doubles, one boundary crossing (same reason as `transformShape`'s motions):
//
//   [0..2]   plane origin        [3..5] plane normal        [6..8] plane x-axis
//   [9..10]  start (u, v) in the plane's 2D frame
//   then one segment per 5 doubles:  [kind, viaU, viaV, toU, toV]
//       kind 0 = LINE  (via ignored)
//       kind 1 = ARC   (a three-point arc through `via` — deliberately not centre+radius+sweep, which
//                       needs a handedness flag and fails when the radius is too small for the chord)
//
// ⚠ THE SEGMENT INDEX *IS* THE NAMING CONTRACT, and it is the whole reason this op can exist.
// `lateral.k` means "the face swept from the k-th segment THE AUTHOR DREW". So dragging a slab's
// corner moves the boundary without renumbering anything, and an opening hosted on `lateral.2` is
// still on `lateral.2` afterwards. That holds only because k comes from the AUTHORED list — never
// from OCCT's traversal of the wire, which is exactly the sort of leak D8's canonical re-sort exists
// to prevent.
const int PROFILE_HEADER = 11;
const int SEG_STRIDE = 5;
const int SEG_LINE = 0;
const int SEG_ARC = 1;

bool buildProfileFace(const std::vector<double>& p, TopoDS_Face& outFace,
                      std::vector<TopoDS_Edge>& outSegEdges) {
  if (p.size() < static_cast<std::size_t>(PROFILE_HEADER + SEG_STRIDE) ||
      (p.size() - static_cast<std::size_t>(PROFILE_HEADER)) % SEG_STRIDE != 0) {
    g_lastError = "INVALID_PAYLOAD: malformed profile";
    return false;
  }

  const gp_Pnt origin(p[0], p[1], p[2]);
  const gp_Vec normal(p[3], p[4], p[5]);
  const gp_Vec xAxis(p[6], p[7], p[8]);
  if (normal.Magnitude() <= gp::Resolution() || xAxis.Magnitude() <= gp::Resolution()) {
    g_lastError = "INVALID_PAYLOAD: the profile plane needs a non-zero normal and x-axis";
    return false;
  }
  const gp_Dir nDir(normal);
  // Orthogonalise the author's x-axis against the normal, so a slightly-off x-axis is a usable frame
  // rather than a failure. If it is PARALLEL to the normal there is no frame to recover.
  const gp_Vec xProj = xAxis - gp_Vec(nDir) * xAxis.Dot(gp_Vec(nDir));
  if (xProj.Magnitude() <= gp::Resolution()) {
    g_lastError = "INVALID_PAYLOAD: the profile plane's x-axis must not be parallel to its normal";
    return false;
  }
  const gp_Dir xDir(xProj);
  const gp_Dir yDir(gp_Vec(nDir).Crossed(gp_Vec(xDir)));

  const auto at = [&](double u, double v) {
    return gp_Pnt(origin.XYZ() + xDir.XYZ() * u + yDir.XYZ() * v);
  };

  const std::size_t n = (p.size() - static_cast<std::size_t>(PROFILE_HEADER)) / SEG_STRIDE;
  const gp_Pnt startPnt = at(p[9], p[10]);
  gp_Pnt cursor = startPnt;

  BRepBuilderAPI_MakeWire wire;
  std::vector<TopoDS_Edge> authored;
  for (std::size_t k = 0; k < n; ++k) {
    const std::size_t b = static_cast<std::size_t>(PROFILE_HEADER) + k * SEG_STRIDE;
    const int kind = static_cast<int>(p[b]);
    gp_Pnt end = at(p[b + 3], p[b + 4]);

    if (k + 1 == n) {
      // The loop must close. Verify the author MEANT it to, then snap exactly — so OCCT sees one
      // vertex rather than two a nanometre apart, which is a wire that looks closed and is not.
      if (!end.IsEqual(startPnt, 1e-6)) {
        g_lastError =
            "INVALID_PROFILE: the profile is not closed — the last segment must end where the first "
            "began";
        return false;
      }
      end = startPnt;
    }

    TopoDS_Edge edge;
    if (kind == SEG_LINE) {
      if (cursor.IsEqual(end, 1e-9)) {
        g_lastError = "INVALID_PROFILE: a segment has zero length";
        return false;
      }
      edge = BRepBuilderAPI_MakeEdge(cursor, end);
    } else if (kind == SEG_ARC) {
      const GC_MakeArcOfCircle arc(cursor, at(p[b + 1], p[b + 2]), end);
      if (!arc.IsDone()) {
        g_lastError =
            "INVALID_PROFILE: an arc segment is degenerate (its three points are collinear or "
            "coincident)";
        return false;
      }
      edge = BRepBuilderAPI_MakeEdge(arc.Value());
    } else {
      g_lastError = "INVALID_PAYLOAD: unknown profile segment kind";
      return false;
    }

    wire.Add(edge);
    if (!wire.IsDone()) {
      g_lastError = "INVALID_PROFILE: the profile does not form a single connected loop";
      return false;
    }
    // ⚠ NOT `edge` — `wire.Edge()`. `BRepBuilderAPI_MakeWire` may hand back a COPY of the edge it was
    // given (it says so: "this edge may be a copy... if it had to be reversed or if a vertex had to be
    // modified"). Keeping our own `edge` here loses every segment the wire chose to rebuild, and the
    // op then refuses to name faces it understands perfectly well. Measured, not guessed: with `edge`,
    // every profile with more than three sides failed to resolve.
    authored.push_back(wire.Edge());
    cursor = end;
  }

  BRepBuilderAPI_MakeFace mf(gp_Pln(gp_Ax3(origin, nDir, xDir)), wire.Wire());
  if (!mf.IsDone()) {
    g_lastError = "INVALID_PROFILE: the profile does not bound a planar face";
    return false;
  }
  outFace = mf.Face();

  // ⚠ Closed and planar is NOT enough: a figure-eight boundary is both, and is nonsense. The spec
  // (§5.2) requires the profile be validated non-self-intersecting BEFORE it reaches a solid op.
  if (!BRepCheck_Analyzer(outFace).IsValid()) {
    g_lastError = "INVALID_PROFILE: the profile is self-intersecting";
    return false;
  }

  // Map each AUTHORED segment onto the edge as it exists on the face. ⚠ `MakeWire` may REVERSE an
  // edge's orientation to close the loop, and an OCCT shape map keys on orientation — so match with
  // `IsSame()`, which ignores it. Keying on the raw shape here would silently lose half the segments
  // of any profile drawn clockwise.
  TopTools_IndexedMapOfShape faceEdges;
  TopExp::MapShapes(outFace, TopAbs_EDGE, faceEdges);
  outSegEdges.assign(n, TopoDS_Edge());
  for (std::size_t k = 0; k < n; ++k) {
    bool found = false;
    for (int i = 1; i <= faceEdges.Extent(); ++i) {
      if (faceEdges(i).IsSame(authored[k])) {
        outSegEdges[k] = TopoDS::Edge(faceEdges(i));
        found = true;
        break;
      }
    }
    if (!found) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: a profile segment did not survive into the face";
      return false;
    }
  }
  return true;
}

// ⚠ IS THE SOLID WE JUST PRODUCED ACTUALLY VALID? Nothing used to ask.
//
// An OCCT op can report `IsDone()` and still hand back a shape with self-intersecting faces, wrong
// orientations or an open shell — most often a fillet whose radius exceeds the room available, or a
// boolean on solids that touch tangentially. The result LOOKS fine, renders fine, and is wrong: its
// volume is meaningless, and everything downstream (quantities, the next boolean, the export) inherits
// that quietly. The protocol has reserved `INVALID_RESULT` for exactly this since v1 and NEVER EMITTED
// IT (Entry 13 §4). `extrude` validated its INPUT profile; nothing validated any op's OUTPUT.
//
// `BRepCheck_Analyzer` is OCCT's own checker, so this stays inside the "we trust OCCT, we verify our own
// code" scope (§9.0): we are not auditing its geometry, we are asking it whether IT is happy — and
// refusing to store the shape when it is not, instead of discovering it three operations later.
bool validResult(const TopoDS_Shape& shape, const char* what) {
  if (BRepCheck_Analyzer(shape).IsValid()) return true;
  g_lastError = std::string("INVALID_RESULT: ") + what +
                " produced a topologically invalid solid (OCCT reported success, but the result does "
                "not check out — most often a fillet/chamfer larger than the geometry allows)";
  return false;
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

// EXTRUDE — sweep an authored profile into a solid. The op three of the five MVP types need.
//
// ⚠ WHY THIS OP EXISTS, AND WHY IT IS NOT A NICE-TO-HAVE. `makeBox` cannot express a Slab, which the
// spec (§5) defines as "planar boundary + thickness" — a boundary is a POLYGON, and a real floor
// plate is L-shaped, or five-sided, or has a curved edge. It cannot express a Column of arbitrary
// profile, and it cannot express GenericSolid ("free sketch + extrude/revolve") at all — the escape
// hatch that keeps the modeller unblocked and is the import target for unmapped IFC. Discovered by
// modelling a building with the protocol and finding the floor plate unbuildable (Entry 12).
//
// NAMING — it names its own faces, from its own accessors, exactly as the box does:
//   cap-start   the profile face itself      (BRepPrimAPI_MakePrism::FirstShape)
//   cap-end     the profile at the far end   (                        ::LastShape)
//   lateral.k   the face swept from AUTHORED segment k   (            ::Generated(edge_k))
//
// The edges then fall out of the face pairs, as they do for the box — a prism over an open polyline
// loop has no seam, because each segment gets its OWN lateral face, so no face closes on itself.
int extrudeProfile(const std::vector<double>& profile, double dx, double dy, double dz) {
  g_lastError.clear();
  try {
    TopoDS_Face face;
    std::vector<TopoDS_Edge> segEdges;
    if (!buildProfileFace(profile, face, segEdges)) return 0;

    const gp_Vec dir(dx, dy, dz);
    if (dir.Magnitude() <= gp::Resolution()) {
      g_lastError = "INVALID_PAYLOAD: the extrusion vector must be non-zero";
      return 0;
    }

    BRepPrimAPI_MakePrism mk(face, dir);
    mk.Build();
    if (!mk.IsDone()) {
      g_lastError = "OCCT_STANDARD_FAILURE: the prism could not be built";
      return 0;
    }

    ShapeEntry entry;
    entry.shape = mk.Shape();

    TopTools_IndexedMapOfShape faceMap;
    TopExp::MapShapes(entry.shape, TopAbs_FACE, faceMap);

    std::vector<std::pair<std::string, int>> named;
    const auto addFace = [&](const std::string& role, const TopoDS_Shape& s) -> bool {
      const int at = faceMap.FindIndex(s);
      if (at == 0) return false;
      named.emplace_back(role, at);
      return true;
    };

    if (!addFace("cap-start", mk.FirstShape()) || !addFace("cap-end", mk.LastShape())) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: the prism's cap faces could not be resolved";
      return 0;
    }
    for (std::size_t k = 0; k < segEdges.size(); ++k) {
      const TopTools_ListOfShape& gen = mk.Generated(segEdges[k]);
      if (gen.Extent() != 1) {
        g_lastError =
            "UNRESOLVED_SUBSHAPE_REF: a profile segment did not generate exactly one lateral face";
        return 0;
      }
      std::ostringstream role;
      role << "lateral." << k;
      if (!addFace(role.str(), gen.First())) {
        g_lastError = "UNRESOLVED_SUBSHAPE_REF: a lateral face could not be resolved";
        return 0;
      }
    }

    // ⚠ Refuse rather than ship a solid carrying a face the operation could not name. An unnamed face
    // is a face nothing can ever be hosted on, and it would surface as a mysteriously unpickable wall
    // weeks later — the exact failure mode `core_logic.md` §5 says to fail loudly on instead.
    if (static_cast<int>(named.size()) != faceMap.Extent()) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: the prism has faces the operation did not name";
      return 0;
    }

    for (const auto& nf : named) {
      NameRow row = blankRow();
      row.relation = REL_PRIMITIVE;
      row.role = nf.first;
      entry.faces.push_back(row);
      entry.faceOcct.push_back(nf.second);
    }

    if (!namePrimitiveEdges(entry, {})) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: prism edges could not be named structurally";
      return 0;
    }
    return store(entry);
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
    g_lastError = "OCCT_STANDARD_FAILURE: non-standard throw";
    return 0;
  }
}

// REVOLVE — spin an authored profile around an axis. The other half of GenericSolid, and the last op
// P2 step 1 named that had never been built. A dome, a baluster, a moulded column base, a tank: none is
// an extrusion, and every one of them is a revolve of a drawn section.
//
// ⚠⚠ IT IS NOT "THE PRISM WITH A ROTATION", AND COPYING THE PRISM WOULD HAVE SHIPPED A KERNEL THAT
// REFUSES EVERY FULL REVOLVE. Everything below is what `probe.cpp` MEASURED on OCCT 7.9.3 (Entry 14) —
// not what the API docs suggest, and not what the design note in §5 predicted. Re-run the probe before
// changing any of it (~60 s); do not re-derive it from the literature, which is wrong here twice over.
//
//   1. A FULL 360° REVOLVE HAS NO CAPS — the solid closes on itself. But `FirstShape()`/`LastShape()`
//      DO NOT RETURN NULL for it: they hand back a face that is NOT IN THE RESULT. So the cap test is
//      "is it in the result", never "is it null". The prism calls both unconditionally and refuses the
//      build if either fails to resolve — which, copied here, refuses every column and every dome.
//
//   2. EACH LATERAL FACE HAS A SEAM (it closes on itself, so no face PAIR bounds the seam edge — the
//      cylinder's problem, Entry 9). But where the cylinder needed `BRepPrim_Cylinder::StartEdge()` to
//      seed its seam, the revolve's seam edge IS THE AUTHORED PROFILE EDGE, passed through by identity.
//      It is named `lateral.k.seam` for free, from the same authored index as the face it bounds.
//
//   3. ⚠ THE ONE NOBODY PREDICTED. A segment PERPENDICULAR to the axis (a radial one) GENERATES NO
//      HISTORY AT ALL in a full revolve — `Generated()` is empty and `IsDeleted()` is TRUE — and yet
//      its face is right there in the result. That face is the flat bottom of every column, the base of
//      every dome, the annulus of every tube. Trusting history would ship solids with unnamed faces;
//      the prism's "refuse if unnamed" guard would instead refuse the shapes themselves.
//
//      THE RESCUE IS STRUCTURAL, AND IT IS EXACT. Every profile VERTEX sweeps into a circle, and OCCT
//      reports THAT faithfully. The face swept from segment k is bounded by exactly the circles swept
//      from segment k's own two endpoint vertices — verified against the raw topology on a tube, a cone
//      and a dome. No coordinates, no tolerance, nothing to drift under a rebuild.
//
//      And it is the same test that tells an ON-AXIS segment apart from a radial one: a vertex ON the
//      axis sweeps NO circle, so an on-axis segment (both endpoints on the axis) expects ZERO circles
//      and therefore NO face — which is correct, because none exists. A radial segment expects one or
//      two, and gets its face. The distinction never touches geometry.
int revolveProfile(const std::vector<double>& profile, double ox, double oy, double oz, double ax,
                   double ay, double az, double angleDeg) {
  g_lastError.clear();
  try {
    TopoDS_Face face;
    std::vector<TopoDS_Edge> segEdges;
    if (!buildProfileFace(profile, face, segEdges)) return 0;

    if (ax * ax + ay * ay + az * az <= 0) {
      g_lastError = "INVALID_PAYLOAD: the revolve axis must be a non-zero direction";
      return 0;
    }
    if (!(angleDeg > 0) || angleDeg > 360.0) {
      g_lastError = "INVALID_PAYLOAD: the revolve angle must be in (0, 360] degrees";
      return 0;
    }

    const gp_Ax1 axis(gp_Pnt(ox, oy, oz), gp_Dir(ax, ay, az));
    BRepPrimAPI_MakeRevol mk(face, axis, angleDeg * M_PI / 180.0);
    mk.Build();
    if (!mk.IsDone()) {
      // The ordinary cause is an axis that crosses the profile's interior — the profile would sweep
      // through itself. Say so, rather than "something went wrong".
      g_lastError =
          "INVALID_PROFILE: the revolve could not be built — the axis must not cross the profile";
      return 0;
    }

    ShapeEntry entry;
    entry.shape = mk.Shape();
    // An axis grazing the profile can yield a "successful" but self-intersecting solid. Catch it here
    // rather than let a meaningless volume reach a quantity schedule.
    if (!validResult(entry.shape, "the revolve")) return 0;

    TopTools_IndexedMapOfShape faceMap, edgeMap;
    TopExp::MapShapes(entry.shape, TopAbs_FACE, faceMap);
    TopExp::MapShapes(entry.shape, TopAbs_EDGE, edgeMap);

    TopTools_IndexedDataMapOfShapeListOfShape edgeFaces;
    TopExp::MapShapesAndAncestors(entry.shape, TopAbs_EDGE, TopAbs_FACE, edgeFaces);

    std::vector<std::pair<std::string, int>> named;
    std::vector<bool> claimed(static_cast<std::size_t>(faceMap.Extent()) + 1, false);
    const auto addFace = [&](const std::string& role, int at) -> bool {
      if (at == 0 || claimed[static_cast<std::size_t>(at)]) return false;
      claimed[static_cast<std::size_t>(at)] = true;
      named.emplace_back(role, at);
      return true;
    };

    // (1) THE CAPS — and note the test. `FindIndex(...) != 0` asks "is this face IN THE RESULT", which
    // is the question; `IsNull()` asks something else and would answer "no caps here" for a shape that
    // has them, and "caps!" for a full revolve that has none.
    const int capStart = faceMap.FindIndex(mk.FirstShape());
    const int capEnd = faceMap.FindIndex(mk.LastShape());
    const bool hasCaps = capStart != 0 && capEnd != 0;
    if (hasCaps) {
      if (!addFace("cap-start", capStart) || !addFace("cap-end", capEnd)) {
        g_lastError = "UNRESOLVED_SUBSHAPE_REF: the revolve's cap faces could not be resolved";
        return 0;
      }
    }

    // The circle (or arc) each profile VERTEX sweeps. This is the relation OCCT reports faithfully even
    // where it reports nothing for the edge, and it is what names the faces history abandons.
    const auto sweptCirclesOf = [&](const TopoDS_Edge& seg) {
      std::vector<int> circles;
      TopoDS_Vertex v1, v2;
      TopExp::Vertices(seg, v1, v2);
      for (const TopoDS_Vertex& v : {v1, v2}) {
        if (v.IsNull()) continue;
        for (TopTools_ListOfShape::Iterator it(mk.Generated(v)); it.More(); it.Next()) {
          if (it.Value().ShapeType() != TopAbs_EDGE) continue;
          const TopoDS_Edge& e = TopoDS::Edge(it.Value());
          // A vertex ON THE AXIS is invariant: it sweeps into nothing, or into a DEGENERATE edge (a
          // cone's apex). Either way it contributes no boundary, and that absence is the signal.
          if (BRep_Tool::Degenerated(e)) continue;
          const int at = edgeMap.FindIndex(e);
          if (at != 0 && std::find(circles.begin(), circles.end(), at) == circles.end()) {
            circles.push_back(at);
          }
        }
      }
      std::sort(circles.begin(), circles.end());
      return circles;
    };

    // The edges bounding a face, as canonical result indices — the other half of the same comparison.
    const auto boundingEdgesOf = [&](int faceIndex) {
      std::vector<int> edges;
      for (int e = 1; e <= edgeMap.Extent(); ++e) {
        if (BRep_Tool::Degenerated(TopoDS::Edge(edgeMap(e)))) continue;
        const int at = edgeFaces.FindIndex(edgeMap(e));
        if (at == 0) continue;
        for (TopTools_ListOfShape::Iterator it(edgeFaces.FindFromIndex(at)); it.More(); it.Next()) {
          if (faceMap.FindIndex(it.Value()) == faceIndex) {
            edges.push_back(e);
            break;
          }
        }
      }
      std::sort(edges.begin(), edges.end());
      return edges;
    };

    // (3) THE LATERAL FACES — `lateral.k` after the AUTHORED segment, exactly as the prism names them,
    // so dragging a profile vertex re-targets nothing (D26).
    for (std::size_t k = 0; k < segEdges.size(); ++k) {
      std::ostringstream role;
      role << "lateral." << k;

      int generated = 0;
      int at = 0;
      for (TopTools_ListOfShape::Iterator it(mk.Generated(segEdges[k])); it.More(); it.Next()) {
        if (it.Value().ShapeType() != TopAbs_FACE) continue;
        const int f = faceMap.FindIndex(it.Value());
        if (f == 0) continue;  // history naming a face that is not in the result — ignore it
        ++generated;
        at = f;
      }

      if (generated > 1) {
        g_lastError =
            "UNRESOLVED_SUBSHAPE_REF: a profile segment generated more than one face — the segment "
            "index is not an identity for this revolve";
        return 0;
      }

      if (generated == 1) {
        if (!addFace(role.str(), at)) {
          g_lastError = "UNRESOLVED_SUBSHAPE_REF: a revolved lateral face could not be resolved";
          return 0;
        }
        continue;
      }

      // History said NOTHING for this segment. Two possibilities, and they are told apart structurally:
      const std::vector<int> circles = sweptCirclesOf(segEdges[k]);
      if (circles.empty()) {
        // Both endpoints are on the axis ⇒ the segment sweeps into the axis line. There is no face,
        // and that is correct — not a failure. (The closing side of a cone, of a dome, of a sphere.)
        continue;
      }

      // Otherwise the face EXISTS and history simply does not mention it (finding 3): the annulus or
      // the disc swept from a radial segment. It is the unclaimed face bounded by exactly the circles
      // this segment's own endpoints swept.
      int match = 0;
      int matches = 0;
      for (int f = 1; f <= faceMap.Extent(); ++f) {
        if (claimed[static_cast<std::size_t>(f)]) continue;
        if (boundingEdgesOf(f) == circles) {
          ++matches;
          match = f;
        }
      }
      if (matches != 1) {
        // Refuse rather than guess. An unnamed face is a face nothing can ever be hosted on, and a
        // WRONGLY named one is worse: it silently re-targets a reference (core_logic.md §5).
        g_lastError =
            "UNRESOLVED_SUBSHAPE_REF: a revolved face could not be identified from the circles its "
            "segment's endpoints swept";
        return 0;
      }
      if (!addFace(role.str(), match)) {
        g_lastError = "UNRESOLVED_SUBSHAPE_REF: a revolved lateral face could not be resolved";
        return 0;
      }
    }

    if (static_cast<int>(named.size()) != faceMap.Extent()) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: the revolve has faces the operation did not name";
      return 0;
    }

    for (const auto& nf : named) {
      NameRow row = blankRow();
      row.relation = REL_PRIMITIVE;
      row.role = nf.first;
      entry.faces.push_back(row);
      entry.faceOcct.push_back(nf.second);
    }

    // (2) THE SEAMS. A seam edge is bounded by ONE face twice, so the face-pair rule cannot name it and
    // `namePrimitiveEdges` would refuse the whole shape. Seed it — and the seam of `lateral.k` is
    // literally the authored segment edge k, which OCCT passes through by identity.
    //
    // The test is STRUCTURAL, not "did the caller ask for 360°": seed exactly those surviving segment
    // edges that fewer than two distinct faces bound. A partial revolve's segment edges survive as
    // ordinary edges of the start cap, bounded by two faces, and the face-pair rule names them — so
    // this seeds nothing there, without the op having to reason about its own angle.
    std::map<int, std::string> seeded;
    for (std::size_t k = 0; k < segEdges.size(); ++k) {
      const int at = edgeMap.FindIndex(segEdges[k]);
      if (at == 0) continue;  // consumed by the sweep (the ordinary case for a partial revolve's caps)
      const int anc = edgeFaces.FindIndex(segEdges[k]);
      if (anc == 0) continue;
      std::vector<int> distinct;
      for (TopTools_ListOfShape::Iterator it(edgeFaces.FindFromIndex(anc)); it.More(); it.Next()) {
        const int f = faceMap.FindIndex(it.Value());
        if (std::find(distinct.begin(), distinct.end(), f) == distinct.end()) distinct.push_back(f);
      }
      if (distinct.size() < 2) {
        std::ostringstream role;
        role << "lateral." << k << ".seam";
        seeded[at] = role.str();
      }
    }

    if (!namePrimitiveEdges(entry, seeded)) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: revolve edges could not be named structurally";
      return 0;
    }
    return store(entry);
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
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
    if (!validResult(entry.shape, "the boolean")) return 0;

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
    if (!validResult(entry.shape, "the fillet")) return 0;
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

// CHAMFER — the fillet's flat sibling, and the other half of the spec's "fillet/chamfer" command
// (§5.2, plan P5 step 7). Same contract in every respect: it addresses its edge BY IDENTITY, and its
// output runs through the SAME `nameDerived` resolver as the fillet and the boolean — no special case.
//
// It shares the fillet's weak spot, measured not assumed (probe, Entry 9): the maker rebuilds the
// surrounding edges as brand-new objects with no history, and they come back through the ADJACENT
// rule — re-derived from the two faces bounding them, which still belong to the wall, so the edge
// keeps the wall's own token byte for byte.
int chamfer(int handle, int edgeIndex, double distance) {
  g_lastError.clear();
  try {
    const ShapeEntry* src = lookup(handle);
    if (src == nullptr) {
      g_lastError = "HANDLE_NOT_FOUND: no live shape for the chamfer's target";
      return 0;
    }
    if (!(distance > 0)) {
      g_lastError = "INVALID_PAYLOAD: the chamfer distance must be positive and finite";
      return 0;
    }
    if (edgeIndex < 0 || edgeIndex >= static_cast<int>(src->edgeOcct.size())) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: the edge to chamfer is not a named edge of this shape";
      return 0;
    }

    TopTools_IndexedMapOfShape edgeMap;
    TopExp::MapShapes(src->shape, TopAbs_EDGE, edgeMap);

    BRepFilletAPI_MakeChamfer mk(src->shape);
    mk.Add(distance, TopoDS::Edge(edgeMap(src->edgeOcct[static_cast<std::size_t>(edgeIndex)])));
    mk.Build();
    if (!mk.IsDone()) {
      // Same cause as the fillet's: a distance wider than the faces it must fit on. Reuses the
      // protocol's dedicated code so the UI can say "too large" rather than "failed".
      g_lastError = "FILLET_RADIUS_TOO_LARGE: the chamfer could not be built at this distance";
      return 0;
    }

    ShapeEntry entry;
    entry.shape = mk.Shape();
    if (!validResult(entry.shape, "the chamfer")) return 0;
    entry.operands = {handle};
    const std::vector<const ShapeEntry*> operands{src};
    if (!nameDerived(operands, mk, entry)) return 0;
    return store(entry);
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
    g_lastError = "OCCT_STANDARD_FAILURE: non-standard throw";
    return 0;
  }
}

// TRANSFORM — rotate / mirror / translate. The op that creates NO identities.
//
// ⚠ IT NAMES NOTHING, AND THAT IS THE ENTIRE POINT. A rigid transform is a topological isomorphism:
// every face maps to exactly one face, every edge to exactly one edge. So every row the resolver
// produces here comes back REL_INHERIT — one same-kind ancestor, fan-out 1 — and TypeScript passes
// the operand's token through untouched. **A rotated wall is the same wall**, and the window hosted
// on its y-min face is still hosted there afterwards.
//
// MEASURED, not assumed (probe.cpp cases 7-10, re-runnable in ~60 s): a rotation (both copy modes), a
// MIRROR (a negative, handedness-flipping transform), and a rotation of a wall that ALREADY has an
// opening cut through it — all three report 100% of output faces AND edges through `Modified()`, 1:1,
// with zero orphans and zero sub-shapes needing the adjacency fallback. The mirror's solid also comes
// back with POSITIVE volume (1.5e9 mm3 for the standard wall), which is the check that a mishandled
// negative transform would have failed silently.
//
// Motions arrive as a flat array, 8 doubles each — kind, then a direction, then an origin, then an
// angle — and are applied IN ORDER. A flat array rather than a vector of structs because embind pays
// a boundary crossing per element and this keeps it to one small copy.
//
//   translate : [0, tx,ty,tz,  0, 0, 0,  0      ]
//   rotate    : [1, ax,ay,az,  ox,oy,oz, degrees]
//   mirror    : [2, nx,ny,nz,  ox,oy,oz, 0      ]   <- normal of the mirror PLANE
const int MOTION_STRIDE = 8;
const int MOTION_TRANSLATE = 0;
const int MOTION_ROTATE = 1;
const int MOTION_MIRROR = 2;

int transformShape(int handle, const std::vector<double>& motions) {
  g_lastError.clear();
  try {
    const ShapeEntry* src = lookup(handle);
    if (src == nullptr) {
      g_lastError = "HANDLE_NOT_FOUND: no live shape to transform";
      return 0;
    }
    if (motions.empty() || motions.size() % MOTION_STRIDE != 0) {
      g_lastError = "INVALID_PAYLOAD: transform needs at least one motion, 8 doubles each";
      return 0;
    }
    for (const double v : motions) {
      if (!std::isfinite(v)) {
        g_lastError = "INVALID_PAYLOAD: a motion carries a non-finite number";
        return 0;
      }
    }

    gp_Trsf total;  // identity
    const std::size_t count = motions.size() / MOTION_STRIDE;
    for (std::size_t m = 0; m < count; ++m) {
      const double* p = &motions[m * MOTION_STRIDE];
      const int kind = static_cast<int>(p[0]);
      const gp_Pnt at(p[4], p[5], p[6]);
      // A zero-length direction cannot be normalised, and gp_Dir THROWS on one. Catching it here turns
      // a caller's typo into a typed failure instead of an OCCT exception crossing the boundary.
      const double len = std::sqrt(p[1] * p[1] + p[2] * p[2] + p[3] * p[3]);

      gp_Trsf step;
      if (kind == MOTION_TRANSLATE) {
        step.SetTranslation(gp_Vec(p[1], p[2], p[3]));
      } else if (kind == MOTION_ROTATE) {
        if (len < gp::Resolution()) {
          g_lastError = "INVALID_PAYLOAD: a rotation axis must not be zero-length";
          return 0;
        }
        step.SetRotation(gp_Ax1(at, gp_Dir(p[1], p[2], p[3])), p[7] * M_PI / 180.0);
      } else if (kind == MOTION_MIRROR) {
        if (len < gp::Resolution()) {
          g_lastError = "INVALID_PAYLOAD: a mirror plane's normal must not be zero-length";
          return 0;
        }
        step.SetMirror(gp_Ax2(at, gp_Dir(p[1], p[2], p[3])));
      } else {
        g_lastError = "INVALID_PAYLOAD: unknown motion kind";
        return 0;
      }
      // PreMultiply: total := step * total, so the FIRST motion in the array is applied first.
      total.PreMultiply(step);
    }

    // Copy=false shares the underlying TShape and swaps only the Location — cheaper, and measured to
    // report history identically to Copy=true. The source's TShape is reference-counted, so releasing
    // the source handle afterwards cannot pull the ground out from under the result.
    BRepBuilderAPI_Transform mk(src->shape, total, false);
    mk.Build();
    if (!mk.IsDone()) {
      g_lastError = "OCCT_STANDARD_FAILURE: the transform did not complete";
      return 0;
    }

    ShapeEntry entry;
    entry.shape = mk.Shape();
    entry.operands = {handle};
    const std::vector<const ShapeEntry*> operands{src};
    // The same resolver as the boolean and the fillet — no special case. If OCCT ever stops reporting
    // a transform as a clean 1:1 map, this REFUSES rather than inventing a name, and the probe is the
    // instrument that says why.
    if (!nameDerived(operands, mk, entry)) return 0;
    return store(entry);
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return 0;
  } catch (...) {
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

  // ⚠⚠ `AddOptimal`, NOT `Add` — AND THE DIFFERENCE IS INVISIBLE ON EVERY SHAPE BUT ONE.
  //
  // `BRepBndLib::Add` bounds a curve by its CONTROL POLYGON, and a B-spline's control points lie
  // OUTSIDE the curve they define. On a box, a cylinder or any planar/analytic face the two agree
  // exactly — which is why this stood for seven entries. The first shape in this project with a
  // SPLINE edge is the rim of a duct drilled through a round column (D28), and there `Add` overshot
  // the true box by 7 microns: it reported x-min = -400.0071 for a column of radius 400.
  //
  // Caught by the golden harness against the native OCCT oracle, which had used `AddOptimal` all
  // along. Third time the harness has caught the same class of bug, and it is always the same class:
  // OUR misuse of an OCCT API, never an OCCT defect (spec §9.0).
  BRepBndLib::AddOptimal(entry->shape, box);

  // ⚠ And OCCT's bounding box is TOLERANT, not tight: it is enlarged by the shape's tolerance
  // (~1e-7 mm), and `Get` then returns min-gap / max+gap, so a box sitting exactly on the origin
  // reports xMin = -1e-7. The spec asks for the tight box (it is compared against exact goldens, and
  // it is what the viewport frames), so drop the gap too.
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

// THE FACE FRAME — origin, outward normal and two in-plane tangents at the face's parametric centre,
// read from the actual surface. It is what a hosted void needs to place a cut on a face whose bounding
// box cannot describe it: a cylinder's lateral face has a bbox equal to the whole solid, so the
// bbox-only `inward` guess degenerates and a "duct through a round column" was silently bored down the
// column's own axis instead of through its side (Entry 30). This reads the B-Rep, so it is exact for a
// planar face and correct at the sampled point for a curved one — which is what a straight duct needs.
Frame faceFrame(int handle, int index) {
  Frame f{0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0};
  g_lastError.clear();
  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return f;
  }
  if (index < 0 || index >= static_cast<int>(entry->faceOcct.size())) {
    g_lastError = "UNRESOLVED_SUBSHAPE_REF: no such named face on this shape";
    return f;
  }
  TopTools_IndexedMapOfShape faces;
  TopExp::MapShapes(entry->shape, TopAbs_FACE, faces);
  try {
    const TopoDS_Face face = TopoDS::Face(faces(entry->faceOcct[static_cast<std::size_t>(index)]));
    BRepAdaptor_Surface surf(face);
    // The parametric centre — a point that is genuinely ON the face (a hole-punched or trimmed face
    // still has this midpoint inside its outer bound for the convex primitives the MVP hosts on).
    const double u = 0.5 * (surf.FirstUParameter() + surf.LastUParameter());
    const double v = 0.5 * (surf.FirstVParameter() + surf.LastVParameter());
    gp_Pnt p;
    gp_Vec du, dv;
    surf.D1(u, v, p, du, dv);

    gp_Vec n = du.Crossed(dv);
    if (n.Magnitude() < 1e-12 || du.Magnitude() < 1e-12 || dv.Magnitude() < 1e-12) {
      g_lastError = "OCCT_STANDARD_FAILURE: the face has a degenerate frame at its centre";
      return f;
    }
    n.Normalize();
    // ⚠ OUTWARD, not just "the surface normal": the cross product follows the (u,v) parameterisation,
    // and a face stored TopAbs_REVERSED has its material on the OTHER side — so flip to point out of
    // the solid. This is the sign the bbox heuristic could not recover on a curved face.
    if (face.Orientation() == TopAbs_REVERSED) n.Reverse();

    gp_Vec uAxis = du;
    uAxis.Normalize();
    // Re-orthogonalise v against (n, u) so the frame is a clean right-handed basis regardless of how
    // the surface's own u/v skew.
    gp_Vec vAxis = n.Crossed(uAxis);
    if (vAxis.Magnitude() < 1e-12) {
      g_lastError = "OCCT_STANDARD_FAILURE: the face tangents are parallel";
      return f;
    }
    vAxis.Normalize();

    f.ox = p.X();  f.oy = p.Y();  f.oz = p.Z();
    f.nx = n.X();  f.ny = n.Y();  f.nz = n.Z();
    f.ux = uAxis.X();  f.uy = uAxis.Y();  f.uz = uAxis.Z();
    f.vx = vAxis.X();  f.vy = vAxis.Y();  f.vz = vAxis.Z();
    return f;
  } catch (const Standard_Failure& e) {
    g_lastError = std::string("OCCT_STANDARD_FAILURE: ") + e.GetMessageString();
    return f;
  }
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

// The exact properties of a whole shape (kind < 0) or of ONE NAMED SUB-SHAPE of it (a face, an edge) —
// addressed by canonical index, which is to say BY ITS IDENTITY, exactly as `subShapeBounds` is.
//
// ⚠ THE SUB-SHAPE FORM IS WHAT MAKES QUANTITIES POSSIBLE, and its absence was an oversight rather than
// a decision (Entry 13). "What is the AREA of that wall face?" is the paint area, the formwork area,
// the cladding take-off — and it was not askable, which quietly foreclosed a declared north-star that
// domain rule 8 forbids foreclosing, left P5's `quantities` hook with nothing to call, and starved
// Miqdar of its entire input.
//
// A FACE reports its area and its perimeter and NO VOLUME: a face encloses nothing, and `VolumeProperties`
// on an open shell returns a number anyway — a plausible, meaningless one that a quantity schedule would
// bill. So volume is reported as exactly zero for anything that is not a solid, deliberately.
Measure measure(int handle, int kind, int index) {
  Measure m{0, 0, 0, 0, 0, 0, 0};
  const ShapeEntry* entry = lookup(handle);
  if (entry == nullptr) {
    g_lastError = "HANDLE_NOT_FOUND";
    return m;
  }

  TopoDS_Shape target = entry->shape;
  if (kind >= 0) {
    const std::vector<int>& map = kind == KIND_FACE ? entry->faceOcct : entry->edgeOcct;
    if (index < 0 || index >= static_cast<int>(map.size())) {
      g_lastError = "UNRESOLVED_SUBSHAPE_REF: no such named sub-shape on this shape";
      return m;
    }
    TopTools_IndexedMapOfShape shapes;
    TopExp::MapShapes(entry->shape, kind == KIND_FACE ? TopAbs_FACE : TopAbs_EDGE, shapes);
    target = shapes(map[static_cast<std::size_t>(index)]);
  }
  const TopoDS_Shape& s = target;

  try {
    if (kind >= 0) {
      // A sub-shape: area (a face's own), perimeter/length, counts. Volume stays 0 — see above.
      if (kind == KIND_FACE) {
        GProp_GProps surf;
        BRepGProp::SurfaceProperties(s, surf);
        m.area = surf.Mass();
      }
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
      m.solids = 0;
      TopExp::MapShapes(s, TopAbs_FACE, map);   m.faces = map.Extent();   map.Clear();
      TopExp::MapShapes(s, TopAbs_EDGE, map);   m.edges = map.Extent();   map.Clear();
      TopExp::MapShapes(s, TopAbs_VERTEX, map); m.vertices = map.Extent();
      return m;
    }

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

// The dlmalloc bytes currently IN USE (mallinfo.uordblks) — the WASM side's OWN witness to how much
// heap the live OCCT solids actually occupy, the fine-grained companion to liveHandles() for the scale
// gate (P4 step 9a: every solid stays live all session, nothing evicts, and WASM32 caps at 4 GB). It
// is the per-solid signal the LINEAR-memory size cannot give — that starts at 64 MB and only jumps at
// growth boundaries, whereas this tracks each allocation. Returned as a double so it stays exact past
// 2 GB, where mallinfo's int field wraps. See tests/document-heap-scale.test.ts.
double heapUsedBytes() {
  struct mallinfo info = mallinfo();
  return static_cast<double>(static_cast<unsigned int>(info.uordblks));
}

EMSCRIPTEN_BINDINGS(bunyan_kernel) {
  using namespace emscripten;

  register_vector<int>("VectorInt");
  register_vector<double>("VectorDouble");
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

  value_object<Frame>("Frame")
      .field("ox", &Frame::ox).field("oy", &Frame::oy).field("oz", &Frame::oz)
      .field("nx", &Frame::nx).field("ny", &Frame::ny).field("nz", &Frame::nz)
      .field("ux", &Frame::ux).field("uy", &Frame::uy).field("uz", &Frame::uz)
      .field("vx", &Frame::vx).field("vy", &Frame::vy).field("vz", &Frame::vz);

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
  function("extrudeProfile", &extrudeProfile);
  function("revolveProfile", &revolveProfile);
  function("booleanOp", &booleanOp);
  function("fillet", &fillet);
  function("chamfer", &chamfer);
  function("transformShape", &transformShape);
  function("getNaming", &getNaming);
  function("getBounds", &getBounds);
  function("subShapeBounds", &subShapeBounds);
  function("faceFrame", &faceFrame);
  function("distanceBetween", &distanceBetween);
  function("classifyPoint", &classifyPoint);
  function("measure", &measure);
  function("tessellate", &tessellate);
  function("releaseShape", &releaseShape);
  function("liveHandles", &liveHandles);
  function("heapUsedBytes", &heapUsedBytes);
  function("lastError", &lastError);
}

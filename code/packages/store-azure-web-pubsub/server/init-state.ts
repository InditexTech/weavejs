import * as Y from "yjs";

const yjsLayer = function (id: string) {
  const newLayerMap = new Y.Map();
  newLayerMap.set("key", id);
  newLayerMap.set("type", "layer");
  const newLayerMapProps = new Y.Map();
  newLayerMapProps.set("id", id);
  newLayerMapProps.set("nodeType", "layer");
  newLayerMapProps.set("children", new Y.Array());
  newLayerMap.set("props", newLayerMapProps);

  return newLayerMap;
};

export function initState(doc: Y.Doc) {
  const children = new Y.Array();
  children.insert(0, [
    yjsLayer("gridLayer"),
    yjsLayer("mainLayer"),
    yjsLayer("selectionLayer"),
    yjsLayer("usersPointersLayer"),
    yjsLayer("utilityLayer"),
  ]);

  const stageProps = new Y.Map();
  stageProps.set("id", "stage");
  stageProps.set("children", children);

  doc.getMap("weave").set("key", "stage");
  doc.getMap("weave").set("type", "stage");
  doc.getMap("weave").set("props", stageProps);
}

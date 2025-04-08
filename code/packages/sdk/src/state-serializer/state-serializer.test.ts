// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { describe, expect, test } from "vitest";
import { WeaveStateSerializer } from "./state-serializer";

describe("state-serializer", () => {
  test("initialization", () => {
    const stateSerializer = new WeaveStateSerializer();
    expect(stateSerializer).toBeDefined();
  });

  test("serialize an element", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = React.createElement("elementtype1", { key: "elementKey1", attr: "elementAttr1" }, []);

    const serializedElement = stateSerializer.serialize(element);

    expect(JSON.parse(serializedElement)).toStrictEqual({
      key: "elementKey1",
      type: "elementtype1",
      props: {
        attr: "elementAttr1",
        children: [],
      },
    });
  });

  test("serialize an anidated element", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = React.createElement("elementtype1", { key: "elementKey1", attr: "elementAttr1" }, [
      React.createElement("elementtype2", { key: "childKey1", attr: "childAttr1" }, []),
      React.createElement("elementtype3", { key: "childKey2", attr: "childAttr2" }, []),
    ]);

    const serializedElement = stateSerializer.serialize(element);

    expect(JSON.parse(serializedElement)).toStrictEqual({
      key: "elementKey1",
      type: "elementtype1",
      props: {
        attr: "elementAttr1",
        children: [
          {
            key: "childKey1",
            type: "elementtype2",
            props: {
              attr: "childAttr1",
              children: [],
            },
          },
          {
            key: "childKey2",
            type: "elementtype3",
            props: {
              attr: "childAttr2",
              children: [],
            },
          },
        ],
      },
    });
  });

  test("deserialize an invalid element", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = 10;

    expect(() => stateSerializer.deserialize(element)).toThrowError("Deserialization error: incorrect data type");
  });

  test("deserialize an element that is a string", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = JSON.stringify({
      key: "elementKey1",
      type: "elementtype1",
      props: {
        attr: "elementAttr1",
        children: [],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deserializedElement: React.DOMElement<any, any> = stateSerializer.deserialize(element);

    expect(deserializedElement.key).toStrictEqual("elementKey1");
    expect(deserializedElement.type).toStrictEqual("elementtype1");
    expect(deserializedElement.props).toStrictEqual({
      attr: "elementAttr1",
      children: [],
    });
  });

  test("deserialize an element that is an object", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = {
      key: "elementKey1",
      type: "elementtype1",
      props: {
        attr: "elementAttr1",
        children: [],
      },
    };

    const deserializedElement = stateSerializer.deserialize(element);

    expect(deserializedElement.key).toStrictEqual("elementKey1");
    expect(deserializedElement.type).toStrictEqual("elementtype1");
    expect(deserializedElement.props).toStrictEqual({
      attr: "elementAttr1",
      children: [],
    });
  });

  test("deserialize an element that is empty", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = {};

    const deserializedElement = stateSerializer.deserialize(element);

    expect(deserializedElement).toStrictEqual({});
  });

  test("deserialize an element that is an array", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = [
      {
        key: "childKey1",
        type: "elementtype1",
        props: {
          attr: "childAttr1",
          children: [],
        },
      },
      {
        key: "childKey2",
        type: "elementtype2",
        props: {
          attr: "childAttr2",
          children: [],
        },
      },
    ];

    const deserializedElement = stateSerializer.deserialize(element);

    expect(deserializedElement[0].key).toStrictEqual("childKey1");
    expect(deserializedElement[0].type).toStrictEqual("elementtype1");
    expect(deserializedElement[0].props).toStrictEqual({
      attr: "childAttr1",
      children: [],
    });

    expect(deserializedElement[1].key).toStrictEqual("childKey2");
    expect(deserializedElement[1].type).toStrictEqual("elementtype2");
    expect(deserializedElement[1].props).toStrictEqual({
      attr: "childAttr2",
      children: [],
    });
  });

  test("deserialize an element that it's type is not an string", () => {
    const stateSerializer = new WeaveStateSerializer();

    const element = {
      key: "elementKey1",
      type: 10,
      props: {
        attr: "elementAttr1",
        children: [],
      },
    };

    expect(() => stateSerializer.deserialize(element)).toThrowError(
      "Deserialization error: element type must be string received [10]",
    );
  });
});

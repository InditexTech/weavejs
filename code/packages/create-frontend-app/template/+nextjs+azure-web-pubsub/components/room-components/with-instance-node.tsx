import React from "react";
import { useWeave } from "@inditextech/weavejs-react";
import { Weave } from "@inditextech/weavejs-sdk";
import { WeaveStateElement } from "@inditextech/weavejs-types";

interface InjectedProps {
  instance: Weave;
  node: WeaveStateElement;
}

interface RequiredProps {
  /**
   * The types of nodes that this component should be rendered for.
   * @example ["text", "image"]
   */
  types?: string[];
}

function withInstanceNode<P extends object>(
  WrappedComponent: React.ComponentType<P & InjectedProps>
): React.FC<Omit<P, keyof InjectedProps> & RequiredProps> {
  const ComponentWithInstanceNode: React.FC<
    Omit<P, keyof InjectedProps> & RequiredProps
  > = (props) => {
    const instance = useWeave((state) => state.instance);
    const node = useWeave((state) => state.selection.node);

    if (!instance || !node) {
      return null;
    }

    if (props.types && !props.types.includes(node.type)) {
      return null;
    }

    return (
      <WrappedComponent
        {...(props as unknown as P)}
        instance={instance}
        node={node}
      />
    );
  };

  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  ComponentWithInstanceNode.displayName = `withInstanceNode(${wrappedComponentName})`;

  return ComponentWithInstanceNode;
}

export default withInstanceNode;

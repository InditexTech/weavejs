import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { Mermaid } from "@/components/mdx/mermaid";

type WrapperProps = {
  children: React.ReactNode;
};

const Wrapper = ({ children }: Readonly<WrapperProps>) => {
  return (
    <div className="p-5 prose-no-margin bg-gray-100/80 border dark:bg-gray-300git /20">
      {children}
    </div>
  );
};

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    img: (props) => (
      <Wrapper>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ImageZoom {...(props as any)} />
      </Wrapper>
    ),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pre: ({ ref: _ref, ...props }) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    Mermaid,
    ...components,
  };
}

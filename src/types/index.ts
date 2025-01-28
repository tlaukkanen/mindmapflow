import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface MindMapNode extends Node {
  data: {
    linkUrl: string;
  };
}

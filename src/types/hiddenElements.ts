/**
 * Type definitions for hidden elements detection
 * @module hiddenElements
 */

export interface HiddenElementData {
  tag: string;
  id?: string;
  classes?: string;
  src?: string;
  width?: number;
  height?: number;
  styles?: {
    zIndex?: string;
    opacity?: string;
    display?: string;
    visibility?: string;
  };
}

export interface HiddenElementsResponse {
  hiddenElements: HiddenElementData[];
  stats?: {
    scanTime: number;
    depth: number;
    totalScanned: number;
  };
}

export interface CategorizedElements {
  trackers: HiddenElementData[];
  pixels: HiddenElementData[];
  zIndexNegative: HiddenElementData[];
  other: HiddenElementData[];
}
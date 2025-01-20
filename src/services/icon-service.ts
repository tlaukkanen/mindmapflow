import {
  PiChatThin,
  PiCircleThin,
  PiDeviceMobileThin,
  PiEnvelopeThin,
  PiFileThin,
  PiNoteThin,
  PiRectangleThin,
  PiTextAaThin,
} from "react-icons/pi";
import { ComponentType } from "react";

type IconMap = { [key: string]: ComponentType };

const iconComponentMap: IconMap = {
  // Shapes
  Rectangle: PiRectangleThin,
  Circle: PiCircleThin,
  Email: PiEnvelopeThin,
  Phone: PiDeviceMobileThin,
  Document: PiFileThin,

  // Annotations
  Text: PiTextAaThin,
  Note: PiNoteThin,
  Comment: PiChatThin,
};


export class IconService {
  static getIconComponent(name: string): ComponentType | undefined {
    return iconComponentMap[name];
  }

}

"use client";

import { CustomFormPreview } from "@common/customForm/CustomFormPreview";
import type { CustomFormSection } from "@common/customForm/types";

type Props = {
  sections: CustomFormSection[];
};

export function PremiseSchemaPreview({ sections }: Props) {
  return <CustomFormPreview sections={sections} />;
}

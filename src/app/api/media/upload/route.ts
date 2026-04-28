import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { processMediaBinaryUpload } from "@/lib/media/upload";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_FORM_DATA",
          message: "Request body must be multipart/form-data.",
        },
      },
      { status: 400 }
    );
  }

  const result = await processMediaBinaryUpload(formData);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: result.code,
          message: result.message,
        },
      },
      { status: result.status }
    );
  }

  revalidatePath("/settings/media-library");

  return NextResponse.json(
    {
      asset: result.asset,
    },
    { status: 201 }
  );
}

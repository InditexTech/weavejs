import { Error } from "@/components/error/error";
import { Suspense } from "react";

export default function ErrorPage() {
  return (
    <Suspense>
      <Error />
    </Suspense>
  );
}

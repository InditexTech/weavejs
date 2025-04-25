"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Logo } from "@/components/utils/logo";
import { useSearchParams } from "next/navigation";
import { getError } from "./errors";

export const Error = () => {
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("errorCode");

  const { description, action, href } = getError(errorCode || "");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative">
      <div className="absolute left-8 top-8 text-lg font-semibold text-primary">
        <h1 className="text-4xl font-noto-sans-mono font-extralight text-foreground uppercase">
          Whiteboard
        </h1>
        <h2 className="text-2xl font-noto-sans-mono font-extralight text-muted-foreground uppercase">
          Error
        </h2>
      </div>
      <div className="absolute left-8 bottom-8 text-lg font-semibold text-primary">
        <Logo />
      </div>

      <Card className="mx-auto max-w-md shadow-lg border-0 shadow-none">
        <CardHeader className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h3 className="text-xl font-noto-sans font-extralight">
            An error has occurred
          </h3>
        </CardHeader>

        <CardContent className="text-center">
          <p>
            <span className="text-sm font-noto-sans-mono">{description}</span>
          </p>
        </CardContent>

        <CardFooter className="flex flex-col mt-3">
          <Button asChild className="w-full font-noto-sans-mono uppercase">
            <Link href={href}>{action}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

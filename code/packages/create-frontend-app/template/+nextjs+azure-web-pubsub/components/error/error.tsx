'use client';

import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Logo } from '@/components/utils/logo';
import { useSearchParams } from 'next/navigation';
import { getError } from './errors';
import { motion } from 'framer-motion';

export const Error = () => {
  const searchParams = useSearchParams();

  const errorCode = searchParams.get('errorCode');

  const { description, action, href } = getError(errorCode || '');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative gap-5">
      <motion.section
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex h-full w-full flex-col items-center justify-center"
      >
        <div className="max-w-[520px] w-full flex flex-col items-center justify-between gap-0 border border-[#c9c9c9]">
          <div className="w-full flex justify-between items-center gap-2 md:left-8 md:top-8 bg-background p-8 py-6 rounded-xl">
            <Logo kind="small" />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-end justify-center"
            >
              <h1 className="text-3xl font-inter font-bold text-foreground uppercase">
                WHITEBOARD
              </h1>
              <h2 className="text-2xl font-inter font-light text-muted-foreground uppercase">
                SHOWCASE
              </h2>
            </motion.div>
          </div>
        </div>
      </motion.section>
      <div className="max-w-[520px] w-full flex flex-col items-center justify-between gap-0 border border-[#c9c9c9]">
        <div className="w-full z-1 flex flex-col gap-2 items-center justify-center bg-transparent">
          <Card className="w-full shadow-none border-0 py-8 gap-0">
            <CardHeader className="flex flex-col items-center text-center gap-0">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-inter font-extralight text-muted-foreground mt-2">
                An error has occurred
              </h3>
            </CardHeader>

            <CardContent className="text-center py-6 pb-8">
              <p>
                <span className="font-inter">{description}</span>
              </p>
            </CardContent>

            <CardFooter className="flex flex-col">
              <Button
                asChild
                className="uppercase cursor-pointer font-inter rounded-none"
              >
                <Link href={href}>{action}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

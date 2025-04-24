"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCollaborationRoom } from "@/store/store";

const formSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, { message: "The username is required" })
      .max(50, { message: "The username must be maximum 50 characters long" }),
    roomId: z
      .string()
      .trim()
      .min(1, { message: "The room name is required" })
      .max(50, { message: "The room name must be maximum 50 characters long" }),
  })
  .required();

function LoginForm() {
  const router = useRouter();

  const setRoom = useCollaborationRoom((state) => state.setRoom);
  const setUser = useCollaborationRoom((state) => state.setUser);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      roomId: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setRoom(values.roomId);
    setUser({
      name: values.username,
      email: `${values.username}@weavejs.com`,
    });
    router.push(`/room/${values.roomId}?userName=${values.username}`);
  }

  return (
    <div
      className="w-full max-w-md"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-5"
        >
          <FormField
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-noto-sans-mono">ROOM</FormLabel>
                <FormControl>
                  <Input
                    placeholder="the room name to join"
                    className="font-noto-sans-mono rounded-none shadow-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-noto-sans-mono">USERNAME</FormLabel>
                <FormControl>
                  <Input
                    placeholder="your username"
                    className="font-noto-sans-mono rounded-none shadow-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full cursor-pointer font-mono rounded-none"
          >
            ENTER THE ROOM
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default LoginForm;

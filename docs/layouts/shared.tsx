import type { ReactNode } from "react";
import type { LinkItemType } from "fumadocs-ui/layouts/links";
import type { NavProviderProps } from "fumadocs-ui/contexts/layout";
import { Slot } from "@radix-ui/react-slot";
import type { I18nConfig } from "fumadocs-core/i18n";
import { Github } from "lucide-react";

export interface NavOptions extends NavProviderProps {
  enabled: boolean;
  component: ReactNode;

  title?: ReactNode;

  /**
   * Redirect url of title
   * @defaultValue '/'
   */
  url?: string;

  children?: ReactNode;
}

export interface BaseLayoutProps {
  themeSwitch?: {
    enabled?: boolean;
    component?: ReactNode;
    mode?: "light-dark" | "light-dark-system";
  };

  searchToggle?: Partial<{
    enabled: boolean;
    components: Partial<{
      sm: ReactNode;
      lg: ReactNode;
    }>;
  }>;

  /**
   * Remove theme switcher component
   *
   * @deprecated Use `themeSwitch.enabled` instead.
   */
  disableThemeSwitch?: boolean;

  /**
   * I18n options
   *
   * @defaultValue false
   */
  i18n?: boolean | I18nConfig;

  /**
   * GitHub url
   */
  githubUrl?: string;

  links?: LinkItemType[];
  /**
   * Replace or disable navbar
   */
  nav?: Partial<NavOptions>;

  children?: ReactNode;
}

export { type LinkItemType };

/**
 * Get Links Items with shortcuts
 */
export function getLinks(
  links: LinkItemType[] = [],
  githubUrl?: string
): LinkItemType[] {
  let result = links ?? [];

  if (githubUrl)
    result = [
      ...result,
      {
        type: "icon",
        url: githubUrl,
        text: "Github",
        label: "GitHub",
        icon: <Github />,
        external: true,
      },
    ];

  return result;
}

export function slot(
  obj:
    | {
        enabled?: boolean;
        component?: ReactNode;
      }
    | undefined,
  def: ReactNode,
  customComponentProps?: object,
  disabled?: ReactNode
): ReactNode {
  if (obj?.enabled === false) return disabled;
  if (obj?.component !== undefined)
    return <Slot {...customComponentProps}>{obj.component}</Slot>;

  return def;
}

export function slots<Comp extends Record<string, ReactNode>>(
  variant: keyof Comp,
  obj:
    | {
        enabled?: boolean;
        components?: Comp;
      }
    | undefined,
  def: ReactNode
): ReactNode {
  if (obj?.enabled === false) return;
  if (obj?.components?.[variant] !== undefined)
    return <Slot>{obj.components[variant]}</Slot>;

  return def;
}

export function omit<T extends Record<string, unknown>, Keys extends keyof T>(
  obj: T,
  ...keys: Keys[]
): Omit<T, Keys> {
  const clone = { ...obj };
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
}

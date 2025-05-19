import { Fragment, type HTMLAttributes, useMemo } from "react";
import { type NavOptions, slot, slots } from "fumadocs-ui/layouts/shared";
import { cn } from "fumadocs-ui/utils/cn";
import { type BaseLayoutProps, getLinks } from "./shared";
import { NavProvider } from "fumadocs-ui/contexts/layout";
import {
  Navbar,
  NavbarLink,
  NavbarMenu,
  NavbarMenuContent,
  NavbarMenuLink,
  NavbarMenuTrigger,
} from "./home/navbar";
import { type LinkItemType } from "fumadocs-ui/layouts/links";
import {
  LargeSearchToggle,
  SearchToggle,
} from "@/components/layout/search-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  LanguageToggle,
  LanguageToggleText,
} from "fumadocs-ui/components/layout/language-toggle";
import { ChevronDown, Languages } from "lucide-react";
import Link from "fumadocs-core/link";
import {
  Menu,
  MenuContent,
  MenuLinkItem,
  MenuTrigger,
} from "fumadocs-ui/layouts/home/menu";

export interface HomeLayoutProps extends BaseLayoutProps {
  nav?: Partial<
    NavOptions & {
      /**
       * Open mobile menu when hovering the trigger
       */
      enableHoverToOpen?: boolean;
    }
  >;
}

export function HomeLayout(
  props: HomeLayoutProps & HTMLAttributes<HTMLElement>
) {
  const {
    nav,
    links,
    githubUrl,
    i18n,
    disableThemeSwitch = false,
    themeSwitch = { enabled: !disableThemeSwitch },
    searchToggle,
    ...rest
  } = props;

  return (
    <NavProvider transparentMode={nav?.transparentMode}>
      <main
        id="nd-home-layout"
        {...rest}
        className={cn("flex flex-1 flex-col pt-[84px]", rest.className)}
      >
        {slot(
          nav,
          <Header
            links={links}
            nav={nav}
            themeSwitch={themeSwitch}
            searchToggle={searchToggle}
            i18n={i18n}
            githubUrl={githubUrl}
          />
        )}
        {props.children}
      </main>
    </NavProvider>
  );
}

export function Header({
  nav = {},
  i18n = false,
  links,
  githubUrl,
  themeSwitch,
  searchToggle,
}: HomeLayoutProps) {
  const finalLinks = useMemo(
    () => getLinks(links, githubUrl),
    [links, githubUrl]
  );

  const navItems = finalLinks.filter((item) =>
    ["nav", "all"].includes(item.on ?? "all")
  );
  const menuItems = finalLinks.filter((item) =>
    ["menu", "all"].includes(item.on ?? "all")
  );

  return (
    <Navbar>
      <Link
        href={nav.url ?? "/"}
        className="inline-flex items-center gap-2.5 !font-light"
      >
        {nav.title}
      </Link>
      {nav.children}
      <ul className="flex flex-row items-center gap-2 px-6 max-sm:hidden">
        {navItems
          .filter((item) => !isSecondary(item))
          .map((item, i) => (
            <NavbarLinkItem
              key={i}
              item={item}
              className="font-light !text-black dark:!text-white text-[13px] hover:!text-[#757575] hover:!font-medium data-[state=open]:font-medium data-[state=open]:bg-transparent data-[state=open]:!underline data-[state=open]:!underline-offset-4 data-[active=true]:!bg-transparent"
            />
          ))}
      </ul>
      <div className="flex flex-row items-center justify-end gap-[32px] flex-1 mr-[32px]">
        {slots(
          "sm",
          searchToggle,
          <SearchToggle className="lg:hidden" hideIfDisabled />
        )}
        {slots(
          "lg",
          searchToggle,
          <LargeSearchToggle
            className="w-full max-w-[240px] max-lg:hidden"
            hideIfDisabled
          />
        )}
        {slot(
          themeSwitch,
          <ThemeToggle className="max-lg:hidden" mode={themeSwitch?.mode} />
        )}
        {i18n ? (
          <LanguageToggle className="max-lg:hidden">
            <Languages className="size-5" />
          </LanguageToggle>
        ) : null}
      </div>
      <ul className="flex flex-row items-center">
        {navItems.filter(isSecondary).map((item, i) => (
          <NavbarLinkItem
            key={i}
            item={item}
            className="font-light text-black dark:text-white bg-transparent shadow-none text-[13px] dark:hover:!text-[#454545] hover:!text-[#757575] hover:!font-medium hover:!text-black hover:!bg-transparent !w-auto max-lg:hidden"
          />
        ))}
        <Menu className="lg:hidden">
          <MenuTrigger
            aria-label="Toggle Menu"
            className="group -me-2"
            enableHover={nav.enableHoverToOpen}
          >
            <ChevronDown className="size-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </MenuTrigger>
          <MenuContent className="sm:flex-row sm:items-center sm:justify-end bg-white dark:bg-black">
            {menuItems
              .filter((item) => !isSecondary(item))
              .map((item, i) => (
                <MenuLinkItem key={i} item={item} className="sm:hidden" />
              ))}
            <div className="-ms-1.5 flex flex-row items-center gap-1.5 max-sm:mt-2">
              {menuItems.filter(isSecondary).map((item, i) => (
                <MenuLinkItem key={i} item={item} className="-me-1.5" />
              ))}
              <div role="separator" className="flex-1" />
              {i18n ? (
                <LanguageToggle>
                  <Languages className="size-5" />
                  <LanguageToggleText />
                  <ChevronDown className="size-3 text-fd-muted-foreground" />
                </LanguageToggle>
              ) : null}
              {slot(themeSwitch, <ThemeToggle mode={themeSwitch?.mode} />)}
            </div>
          </MenuContent>
        </Menu>
      </ul>
    </Navbar>
  );
}

function NavbarLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === "custom") return <div {...props}>{item.children}</div>;

  if (item.type === "menu") {
    const children = item.items.map((child, j) => {
      if (child.type === "custom")
        return <Fragment key={j}>{child.children}</Fragment>;

      const {
        banner = child.icon ? (
          <div className="w-fit rounded-none border-0 bg-transparent p-1 [&_svg]:size-4">
            {child.icon}
          </div>
        ) : null,
        ...rest
      } = child.menu ?? {};

      return (
        <NavbarMenuLink
          key={j}
          href={child.url}
          external={child.external}
          {...rest}
        >
          {rest.children ?? (
            <>
              {banner}
              <p className="text-[16px] font-light">{child.text}</p>
              <p className="text-[14px] font-light text-black dark:text-white empty:hidden">
                {child.description}
              </p>
            </>
          )}
        </NavbarMenuLink>
      );
    });

    return (
      <NavbarMenu>
        <NavbarMenuTrigger {...props}>
          {item.url ? <Link href={item.url}>{item.text}</Link> : item.text}
        </NavbarMenuTrigger>
        <NavbarMenuContent>{children}</NavbarMenuContent>
      </NavbarMenu>
    );
  }

  return (
    <NavbarLink
      {...props}
      item={item}
      variant={item.type}
      aria-label={item.type === "icon" ? item.label : undefined}
    >
      {item.type === "icon" ? item.icon : item.text}
    </NavbarLink>
  );
}

function isSecondary(item: LinkItemType): boolean {
  return (
    ("secondary" in item && item.secondary === true) || item.type === "icon"
  );
}

"use client";

import React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronRight } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const treeVariants = cva(
  "group hover:before:opacity-100 before:absolute before:rounded-lg before:left-0 px-2 before:w-full before:opacity-0 before:bg-accent/70 before:h-[2rem] before:-z-10"
);

const selectedTreeVariants = cva(
  "before:opacity-100 before:bg-accent/70 text-accent-foreground bg-zinc-100 rounded-lg"
);

const dragOverVariants = cva(
  "before:opacity-100 before:bg-primary/20 text-primary-foreground"
);

interface TreeDataItem {
  id: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedIcon?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openIcon?: any;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  droppable?: boolean;
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItems?: string[];
  onSelectedItemsChange?: (items: string[]) => void;
  expandAll?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultNodeIcon?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultLeafIcon?: any;
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void;
};

type HandleSelectChangeEvent = (
  e: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>,
  item: TreeDataItem | undefined
) => void;

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItems = [],
      onSelectedItemsChange,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      onDocumentDrag,
      ...props
    },
    ref
  ) => {
    const [selectedItems, setSelectedItems] =
      React.useState<string[]>(initialSelectedItems);

    React.useEffect(() => {
      setSelectedItems(initialSelectedItems);
    }, [initialSelectedItems]);

    const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(
      null
    );

    const handleSelectChange = React.useCallback(
      (
        e: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>,
        item: TreeDataItem | undefined
      ) => {
        const selectedItemsSet = new Set(selectedItems);

        const addMultiple = e.ctrlKey || e.metaKey;

        if (selectedItemsSet.has(item?.id ?? "") && addMultiple) {
          selectedItemsSet.delete(item?.id ?? "");
        } else if (!selectedItemsSet.has(item?.id ?? "") && addMultiple) {
          selectedItemsSet.add(item?.id ?? "");
        } else if (selectedItemsSet.has(item?.id ?? "") && !addMultiple) {
          selectedItemsSet.clear();
        } else if (!selectedItemsSet.has(item?.id ?? "") && !addMultiple) {
          selectedItemsSet.clear();
          selectedItemsSet.add(item?.id ?? "");
        }

        setSelectedItems(Array.from(selectedItemsSet));
        onSelectedItemsChange?.(Array.from(selectedItemsSet));
      },
      [selectedItems, onSelectedItemsChange]
    );

    const handleDragStart = React.useCallback((item: TreeDataItem) => {
      setDraggedItem(item);
    }, []);

    const handleDrop = React.useCallback(
      (targetItem: TreeDataItem) => {
        if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
          onDocumentDrag(draggedItem, targetItem);
        }
        setDraggedItem(null);
      },
      [draggedItem, onDocumentDrag]
    );

    const expandedItemIds = React.useMemo(() => {
      if (!initialSelectedItems) {
        return [] as string[];
      }

      const ids: string[] = [];

      function walkTreeItems(
        items: TreeDataItem[] | TreeDataItem,
        targetId: string
      ) {
        if (items instanceof Array) {
          for (let i = 0; i < items.length; i++) {
            ids.push(items[i]!.id);
            if (walkTreeItems(items[i]!, targetId) && !expandAll) {
              return true;
            }
            if (!expandAll) ids.pop();
          }
        } else if (!expandAll && items.id === targetId) {
          return true;
        } else if (items.children) {
          return walkTreeItems(items.children, targetId);
        }
      }

      initialSelectedItems.forEach((selectedItem) => {
        walkTreeItems(data, selectedItem);
      });

      return ids;
    }, [data, expandAll, initialSelectedItems]);

    return (
      <div className={cn("overflow-hidden relative p-2", className)}>
        <TreeItem
          data={data}
          ref={ref}
          selectedItems={selectedItems}
          handleSelectChange={handleSelectChange}
          expandedItemIds={expandedItemIds}
          defaultLeafIcon={defaultLeafIcon}
          defaultNodeIcon={defaultNodeIcon}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedItem={draggedItem}
          {...props}
        />
        <div
          className="w-full h-[48px]"
          onDrop={() => {
            handleDrop({ id: "", name: "parent_div" });
          }}
        ></div>
      </div>
    );
  }
);
TreeView.displayName = "TreeView";

type TreeItemProps = TreeProps & {
  selectedItems?: string[];
  handleSelectChange: HandleSelectChangeEvent;
  expandedItemIds: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultNodeIcon?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultLeafIcon?: any;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
};

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      data,
      selectedItems,
      handleSelectChange,
      expandedItemIds,
      defaultNodeIcon,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref
  ) => {
    if (!(data instanceof Array)) {
      data = [data];
    }
    return (
      <div ref={ref} role="tree" className={className} {...props}>
        <ul>
          {data.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <TreeNode
                  item={item}
                  selectedItems={selectedItems}
                  expandedItemIds={expandedItemIds}
                  handleSelectChange={handleSelectChange}
                  defaultNodeIcon={defaultNodeIcon}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              ) : (
                <TreeLeaf
                  item={item}
                  selectedItems={selectedItems}
                  handleSelectChange={handleSelectChange}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);
TreeItem.displayName = "TreeItem";

const TreeNode = ({
  item,
  handleSelectChange,
  expandedItemIds,
  selectedItems,
  defaultNodeIcon,
  defaultLeafIcon,
  handleDragStart,
  handleDrop,
  draggedItem,
}: {
  item: TreeDataItem;
  handleSelectChange: HandleSelectChangeEvent;
  expandedItemIds: string[];
  selectedItems?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultNodeIcon?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultLeafIcon?: any;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
}) => {
  const [value, setValue] = React.useState(
    expandedItemIds.includes(item.id) ? [item.id] : []
  );
  const [isDragOver, setIsDragOver] = React.useState(false);

  const onDragStart = (e: React.DragEvent) => {
    if (!item.draggable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", item.id);
    handleDragStart?.(item);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleDrop?.(item);
  };

  return (
    <AccordionPrimitive.Root
      type="multiple"
      value={value}
      onValueChange={(s) => setValue(s)}
    >
      <AccordionPrimitive.Item value={item.id}>
        <AccordionTrigger
          className={cn(
            treeVariants(),
            selectedItems?.includes(item.id) ? selectedTreeVariants() : "",
            isDragOver && dragOverVariants()
          )}
          draggable={!!item.draggable}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div
            className="flex"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectChange(e, item);
              item.onClick?.();
            }}
          >
            <TreeIcon
              item={item}
              isSelected={selectedItems?.includes(item.id)}
              isOpen={value.includes(item.id)}
              default={defaultNodeIcon}
            />
            <span className="w-[calc(100%-40px)] text-xs truncate">
              {item.name}
            </span>
            <TreeActions isSelected={selectedItems?.includes(item.id) ?? false}>
              {item.actions}
            </TreeActions>
          </div>
        </AccordionTrigger>
        <AccordionContent className="ml-4 pl-1 border-l">
          <TreeItem
            data={item.children ? item.children : item}
            selectedItems={selectedItems}
            handleSelectChange={handleSelectChange}
            expandedItemIds={expandedItemIds}
            defaultLeafIcon={defaultLeafIcon}
            defaultNodeIcon={defaultNodeIcon}
            handleDragStart={handleDragStart}
            handleDrop={handleDrop}
            draggedItem={draggedItem}
          />
        </AccordionContent>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
};

const TreeLeaf = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    item: TreeDataItem;
    selectedItems?: string[];
    handleSelectChange: HandleSelectChangeEvent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultLeafIcon?: any;
    handleDragStart?: (item: TreeDataItem) => void;
    handleDrop?: (item: TreeDataItem) => void;
    draggedItem: TreeDataItem | null;
  }
>(
  (
    {
      className,
      item,
      selectedItems,
      handleSelectChange,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref
  ) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    const onDragStart = (e: React.DragEvent) => {
      if (!item.draggable) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", item.id);
      handleDragStart?.(item);
    };

    const onDragOver = (e: React.DragEvent) => {
      if (
        item.droppable !== false &&
        draggedItem &&
        draggedItem.id !== item.id
      ) {
        e.preventDefault();
        setIsDragOver(true);
      }
    };

    const onDragLeave = () => {
      setIsDragOver(false);
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleDrop?.(item);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "ml-5 flex text-left items-center py-2 cursor-pointer before:right-1",
          treeVariants(),
          className,
          selectedItems?.includes(item.id) && selectedTreeVariants(),
          isDragOver && dragOverVariants()
        )}
        onClick={(e) => {
          handleSelectChange(e, item);
          item.onClick?.();
        }}
        draggable={!!item.draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        {...props}
      >
        <TreeIcon
          item={item}
          isSelected={selectedItems?.includes(item.id)}
          default={defaultLeafIcon}
        />
        <span className="flex-grow text-xs truncate">{item.name}</span>
        <TreeActions isSelected={selectedItems?.includes(item.id) ?? false}>
          {item.actions}
        </TreeActions>
      </div>
    );
  }
);
TreeLeaf.displayName = "TreeLeaf";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "cursor-pointer flex flex-1 w-full items-center py-2 transition-all first:[&[data-state=open]>svg]:rotate-90",
        className
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50 mr-1" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    {...props}
  >
    <div className="pb-1 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

const TreeIcon = ({
  item,
  isOpen,
  isSelected,
  default: defaultIcon,
}: {
  item: TreeDataItem;
  isOpen?: boolean;
  isSelected?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: any;
}) => {
  let Icon = defaultIcon;
  if (isSelected && item.selectedIcon) {
    Icon = item.selectedIcon;
  } else if (isOpen && item.openIcon) {
    Icon = item.openIcon;
  } else if (item.icon) {
    Icon = item.icon;
  }
  return Icon ? <Icon className="h-4 w-4 shrink-0 mr-2" /> : <></>;
};

const TreeActions = ({
  children,
  isSelected,
}: {
  children: React.ReactNode;
  isSelected: boolean;
}) => {
  return (
    <div
      className={cn(
        isSelected ? "block" : "hidden",
        "absolute right-3 group-hover:block"
      )}
    >
      {children}
    </div>
  );
};

export { TreeView, type TreeDataItem };

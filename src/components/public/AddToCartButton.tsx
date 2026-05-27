"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  addCartCourse,
  addCartPackage,
  readCartItems,
  type CartItemType,
} from "@/components/public/cart-storage";

type AddToCartButtonBaseProps = {
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
};

type AddToCartPackageProps = AddToCartButtonBaseProps & {
  packageId: string;
  courseId?: undefined;
};

type AddToCartCourseProps = AddToCartButtonBaseProps & {
  courseId: string;
  packageId?: undefined;
};

export type AddToCartButtonProps =
  | AddToCartPackageProps
  | AddToCartCourseProps;

export function AddToCartButton(props: AddToCartButtonProps) {
  const { size = "md", fullWidth, className } = props;
  const type: CartItemType = "courseId" in props && props.courseId ? "course" : "package";
  const targetId =
    "courseId" in props && props.courseId
      ? props.courseId
      : (props as AddToCartPackageProps).packageId;

  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const items = readCartItems();
    setIsAdded(
      items.some((item) => item.type === type && item.id === targetId),
    );
  }, [type, targetId]);

  if (isAdded) {
    return (
      <ButtonLink
        className={className}
        fullWidth={fullWidth}
        href="/cart"
        size={size}
        variant="outline"
      >
        ไปที่ตะกร้า
      </ButtonLink>
    );
  }

  return (
    <Button
      className={className}
      fullWidth={fullWidth}
      onClick={() => {
        if (type === "course") {
          addCartCourse(targetId);
        } else {
          addCartPackage(targetId);
        }
        setIsAdded(true);
      }}
      size={size}
    >
      เพิ่มลงตะกร้า
    </Button>
  );
}

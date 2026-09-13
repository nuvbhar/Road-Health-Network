import React, { useState } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "filter";
  isActiveFilter?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  isActiveFilter = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const classes = [
    styles.button,
    styles[variant],
    isHovered && !disabled ? styles.hover : "",
    isActive && !disabled ? styles.active : "",
    isActiveFilter ? styles.activeFilter : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      {...props}
    >
      {children}
    </button>
  );
};

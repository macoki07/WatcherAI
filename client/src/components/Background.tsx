import { ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

const Background = ({
  children
}: Props) => {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Radial gradient background */}
      <div className="green-radial-bg" />

      {/* Animated glow effects */}
      <div className="green-glow glow-left-top" />
      <div className="green-glow glow-right-center" />
      {children}
    </div>
  );
};

export default Background;

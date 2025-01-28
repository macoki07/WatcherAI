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
      <div className="absolute inset-0">
        <div className="green-glow" />
      </div>
      {children}
    </div>
  );
};

export default Background;

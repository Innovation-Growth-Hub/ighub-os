// Each auth page renders its own <AuthFrame> so the mascot can say something page-specific.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return children;
}

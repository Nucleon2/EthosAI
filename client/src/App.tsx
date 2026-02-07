import { HomePage } from "@/features/home";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <>
      <HomePage />
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;

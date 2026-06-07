import { Outlet } from "react-router";
import Header from "./Header";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-[#F7F6F1] font-sans text-[#17211D] flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}

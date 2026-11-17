import Image from "next/image";
import Header from "./components/header";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans">
      <Header />
    </div>
  );
}

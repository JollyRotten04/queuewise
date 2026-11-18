import Image from "next/image";
import Header from "./components/header";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans">
        
      <Header />

      <div className="h-full w-full relative">

        <Image src="/hero-image.svg" alt="Hero" className="absolute z-0 w-full h-auto max-h-[425px] object-cover" width={1200} height={600} />

        <div className="flex flex-1 box-border">
          <div className="absolute z-100 flex flex-col w-full px-8 py-16 box-border">
            <div className="flex flex-col max-w-[400px] flex flex-col gap-2">

            <div className="bg-violet-200/80 px-2.5 py-1.5 h-fit w-fit rounded-lg"><p className="text-violet-600 font-semibold text-xs">Smart Queue. Better Experience</p></div>

              <h1 className="text-6xl font-bold text-black dark:text-zinc-50 text-start">Queue<span className="text-violet-600">Wise</span></h1>

              <p className="text-lg text-start font-bold text-black">Join, Wait, Get Served</p>

              <p className="text-sm text-start font-semibold text-zinc-700">A modern queue and appointment platform for clinics, government offices, banks, and more.</p>

              <div className="flex gap-4">

                <button className="bg-violet-500 rounded-full px-4 py-2 text-white font-semibold mt-4 text-xs w-32">Start Now →</button>

                <button className="bg-white border-zinc-500 rounded-full px-4 py-2 text-violet-600 text-xs font-semibold mt-4 w-32">▷ Watch Demo</button>
              </div>
            </div>

            <div className="flex justify-between mt-12 w-full">

              <div className="bg-white shadow-lg rounded-xl p-4 box-border items-center h-[130px] w-[180px] flex flex-col gap-4 overflow-hidden">

                <p className="text-violet-600 text-2xl">🗲</p>

                <div className="flex flex-col">

                  <p className="text-sm text-center text-zinc-700 font-semibold">Real-Time Updates</p>

                  <p className="text-xs text-center text-zinc-500">Know your position instantly</p>
                </div>
              </div>

              <div className="bg-white shadow-lg rounded-xl p-4 box-border items-center h-[130px] w-[180px] flex flex-col gap-4 overflow-hidden">

                <p className="text-violet-600 text-2xl">𝄜</p>

                <div className="flex flex-col">

                  <p className="text-sm text-center text-zinc-700 font-semibold">Book & Join Queue</p>

                  <p className="text-xs text-center text-zinc-500">Walk in or schedule an appointment</p>
                </div>
              </div>

              <div className="bg-white shadow-lg rounded-xl p-4 box-border items-center h-[130px] w-[180px] flex flex-col gap-4 overflow-hidden">

                <p className="text-violet-600 text-2xl"> ☆</p>

                <div className="flex flex-col">

                  <p className="text-sm text-center text-zinc-700 font-semibold">Priority Lanes</p>

                  <p className="text-xs text-center text-zinc-500">Seniors, PWDs, and Urgent Cases</p>
                </div>
              </div>

              <div className="bg-white shadow-lg rounded-xl p-4 box-border items-center h-[130px] w-[180px] flex flex-col gap-4 overflow-hidden">

                <p className="text-violet-600 text-2xl">🗠</p>

                <div className="flex flex-col">

                  <p className="text-sm text-center text-zinc-700 font-semibold">Smart Analytics</p>

                  <p className="text-xs text-center text-zinc-500">Track performance and optimize service</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

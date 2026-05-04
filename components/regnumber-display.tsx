"use client"
type RegNumberDisplayProps = {
    region?: string;
    country?: string;
    currentTarget: string;
}

export function RegNumberDisplay({region,country,currentTarget}:RegNumberDisplayProps){

    const defaultRegion = "EU";
    const defaultCountry = "S"

    return(
    <>
    <div className="mx-auto mt-3 flex w-full max-w-sm overflow-hidden rounded-xl border-4 border-slate-950 bg-white shadow-lg">
          <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-blue-700 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dotted border-yellow-400 text-[10px] font-bold leading-none">
              {region ?? defaultRegion}
            </span>

            <span className="mt-2 text-2xl font-black leading-none">
                {country ?? defaultCountry}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-3">
            <div className="text-center text-7xl font-black tabular-nums tracking-widest text-slate-950">
              {currentTarget}
            </div>
          </div>
        </div>
    </>
    )
}
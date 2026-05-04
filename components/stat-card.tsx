"use client"

"use client"
type StatCardProps = {
   title: string;
   row1: string;
   row2?: string;
}

export function StatCard({title,row1,row2}:StatCardProps){

   

    return(
    <>
   <div className="rounded-3xl border border-blue-400/20 bg-blue-950/50 shadow-xl shadow-blue-950/40 backdrop-blur p-5">
             <p className="text-sm text-zinc-400">{title}</p>
             <p className="mt-2 text-2xl font-semibold">
               {row1}
             </p>
             {row2 && ( 
             <p className="mt-1 text-sm text-zinc-400">{row2}</p>
             )}
           </div>
    </>
    )
}
"use client";

import Image from "next/image";

type LogoHeaderProps = {
  children?: React.ReactNode;
  description?: string;
  imageClassName?: string;
  textClassName?: string;
};

export function LogoHeader({
    children,
    description,
    imageClassName,
    textClassName,
    }:LogoHeaderProps){


    const defaultImageClassName = "relative mx-2 mb-1 w-24 h-24 md:w-64 md:h-64";
    const defaultTextClassName = "mt-1 text-sm text-zinc-300";
    return(
        <>
            <div>
                <div className={imageClassName ?? defaultImageClassName}>
        
                    <Image
                        src="/logo.png"
                        loading="eager"
                        alt="Skyltjakten"
                        sizes="(min-width: 1024px) 192px, 96px"      
                        fill={true}
                        />
                </div>
                {children}
                <p className={textClassName ?? defaultTextClassName}>
                    {description}
                </p>
            </div>
        </>
    )

}
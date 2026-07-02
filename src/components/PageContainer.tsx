import {type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

export default function PageContainer({
                                          children,
                                      }: Props) {
    return (
        <div className="p-6 lg:p-8">
            {children}
        </div>
    );
}
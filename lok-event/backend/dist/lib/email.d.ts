interface Email {
    to: string;
    subject: string;
    html: string;
    text: string;
}
export declare function envoyerEmail({ to, subject, html, text }: Email): Promise<void>;
export {};
//# sourceMappingURL=email.d.ts.map
import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PendingPR } from "@repo/core";
import { PRRow } from "./PRRow";

vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

const pr: PendingPR = {
    owner: "vercel",
    repo: "next.js",
    full_name: "vercel/next.js",
    number: 123,
    title: "feat: soporte de streaming",
    author: "alexis",
    created_at: new Date().toISOString(),
    url: "",
    draft: false,
};

describe("PRRow", () => {
    it("enlaza a la pantalla de análisis del PR", () => {
        render(<PRRow pr={pr} />);
        expect(screen.getByRole("link")).toHaveAttribute(
            "href",
            "/pr/vercel/next.js/123",
        );
    });

    it("muestra el título, el repo, el número y el autor", () => {
        render(<PRRow pr={pr} />);
        expect(screen.getByText("feat: soporte de streaming")).toBeInTheDocument();
        const text = screen.getByRole("link").textContent ?? "";
        expect(text).toContain("vercel/next.js");
        expect(text).toContain("#123");
        expect(text).toContain("alexis");
    });

    it("marca los borradores con la etiqueta Borrador", () => {
        render(<PRRow pr={{ ...pr, draft: true }} />);
        expect(screen.getByText("Borrador")).toBeInTheDocument();
    });

    it("omite el autor cuando no lo hay", () => {
        render(<PRRow pr={{ ...pr, author: null }} />);
        const text = screen.getByRole("link").textContent ?? "";
        expect(text).not.toContain("alexis");
        expect(text).toContain("#123");
    });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { timeAgo } from "./format";

const NOW = new Date("2026-06-28T12:00:00Z").getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

beforeEach(() => vi.useFakeTimers({ now: NOW }));
afterEach(() => vi.useRealTimers());

const isoAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe("timeAgo", () => {
    it("menos de un minuto: 'hace un momento'", () => {
        expect(timeAgo(isoAgo(30 * 1000))).toBe("hace un momento");
    });

    it("minutos", () => {
        expect(timeAgo(isoAgo(5 * MIN))).toBe("hace 5 min");
    });

    it("horas", () => {
        expect(timeAgo(isoAgo(3 * HOUR))).toBe("hace 3 h");
    });

    it("días", () => {
        expect(timeAgo(isoAgo(2 * DAY))).toBe("hace 2 d");
    });

    it("un mes (singular)", () => {
        expect(timeAgo(isoAgo(45 * DAY))).toBe("hace 1 mes");
    });

    it("varios meses (plural)", () => {
        expect(timeAgo(isoAgo(70 * DAY))).toBe("hace 2 meses");
    });

    it("años", () => {
        expect(timeAgo(isoAgo(400 * DAY))).toBe("hace 1 a");
    });
});

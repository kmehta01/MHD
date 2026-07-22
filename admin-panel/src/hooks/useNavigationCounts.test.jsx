import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import API from "../services/api";
import useNavigationCounts from "./useNavigationCounts";

vi.mock("../services/api", () => ({ default: { get: vi.fn() } }));

describe("useNavigationCounts", () => {
  beforeEach(() => API.get.mockReset());
  afterEach(() => vi.useRealTimers());

  it("loads initially, refreshes on focus, and preserves the last value after failure", async () => {
    API.get.mockResolvedValueOnce({ data: { data: { newGrievances: 4 } } });
    const { result } = renderHook(() => useNavigationCounts(true));
    await waitFor(() => expect(result.current.newGrievances).toBe(4));

    API.get.mockResolvedValueOnce({ data: { data: { newGrievances: 6 } } });
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(result.current.newGrievances).toBe(6));

    API.get.mockRejectedValueOnce(new Error("offline"));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(API.get).toHaveBeenCalledTimes(3));
    expect(result.current.newGrievances).toBe(6);
  });

  it("polls at the configured interval and does not request counts when disabled", async () => {
    vi.useFakeTimers();
    API.get
      .mockResolvedValueOnce({ data: { data: { newGrievances: 1 } } })
      .mockResolvedValueOnce({ data: { data: { newGrievances: 2 } } });
    const { result, rerender } = renderHook(({ enabled }) => useNavigationCounts(enabled, 30000), {
      initialProps: { enabled: true },
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.newGrievances).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(result.current.newGrievances).toBe(2);

    rerender({ enabled: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(API.get).toHaveBeenCalledTimes(2);
  });
});

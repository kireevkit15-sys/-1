"use client";

import { useEffect, useReducer, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getBattleSocket, disconnectBattleSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type {
  BattleState,
  BattleResult,
  Difficulty,
  DefenseType,
} from "@razum/shared";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type BattleStatus =
  | "idle"
  | "connecting"
  | "searching"
  | "in_battle"
  | "finished"
  | "error";

interface BattleHookState {
  status: BattleStatus;
  battle: BattleState | null;
  result: BattleResult | null;
  error: string | null;
  opponentDisconnected: boolean;
}

const initialState: BattleHookState = {
  status: "idle",
  battle: null,
  result: null,
  error: null,
  opponentDisconnected: false,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "CONNECTING" }
  | { type: "SEARCHING" }
  | { type: "BATTLE_STARTED"; battle: BattleState }
  | { type: "BATTLE_UPDATE"; battle: BattleState }
  | { type: "BATTLE_COMPLETE"; result: BattleResult }
  | { type: "MATCHED"; battleId: string }
  | { type: "OPPONENT_DISCONNECTED" }
  | { type: "OPPONENT_RECONNECTED" }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

function reducer(state: BattleHookState, action: Action): BattleHookState {
  switch (action.type) {
    case "CONNECTING":
      return { ...state, status: "connecting", error: null };
    case "SEARCHING":
      return { ...state, status: "searching", error: null };
    case "BATTLE_STARTED":
      return {
        ...state,
        status: "in_battle",
        battle: action.battle,
        result: null,
        error: null,
        opponentDisconnected: false,
      };
    case "BATTLE_UPDATE":
      return { ...state, battle: action.battle };
    case "BATTLE_COMPLETE":
      return { ...state, status: "finished", result: action.result };
    case "MATCHED":
      return { ...state, status: "connecting" };
    case "OPPONENT_DISCONNECTED":
      return { ...state, opponentDisconnected: true };
    case "OPPONENT_RECONNECTED":
      return { ...state, opponentDisconnected: false };
    case "ERROR":
      return { ...state, status: "error", error: action.message };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBattle(battleId?: string) {
  const { data: session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  const battleIdRef = useRef<string | null>(battleId ?? null);

  // -- Connect & subscribe --------------------------------------------------

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;

    const socket = getBattleSocket(token);
    socketRef.current = socket;

    // Server events
    const onStarted = (battle: BattleState) => {
      battleIdRef.current = battle.id;
      dispatch({ type: "BATTLE_STARTED", battle });
    };

    const onState = (battle: BattleState) => {
      battleIdRef.current = battle.id;
      dispatch({ type: "BATTLE_STARTED", battle });
    };

    const onPhaseChanged = (battle: BattleState) => {
      dispatch({ type: "BATTLE_UPDATE", battle });
    };

    const onRoundUpdate = (battle: BattleState) => {
      dispatch({ type: "BATTLE_UPDATE", battle });
    };

    const onComplete = (result: BattleResult) => {
      dispatch({ type: "BATTLE_COMPLETE", result });
    };

    const onQueued = () => {
      dispatch({ type: "SEARCHING" });
    };

    const onMatched = (data: { battleId: string }) => {
      battleIdRef.current = data.battleId;
      dispatch({ type: "MATCHED", battleId: data.battleId });
      socket.emit("battle:join", { battleId: data.battleId });
    };

    const onMatchmakingTimeout = () => {
      dispatch({
        type: "ERROR",
        message: "Противник не найден. Сыграть с ботом?",
      });
    };

    const onOpponentDisconnected = () => {
      dispatch({ type: "OPPONENT_DISCONNECTED" });
    };

    const onOpponentReconnected = () => {
      dispatch({ type: "OPPONENT_RECONNECTED" });
    };

    const onError = (data: { message: string }) => {
      dispatch({ type: "ERROR", message: data.message });
    };

    socket.on("battle:started", onStarted);
    socket.on("battle:state", onState);
    socket.on("battle:phase_changed", onPhaseChanged);
    socket.on("battle:round_update", onRoundUpdate);
    socket.on("battle:complete", onComplete);
    socket.on("battle:queued", onQueued);
    socket.on("battle:matched", onMatched);
    socket.on("battle:matchmaking_timeout", onMatchmakingTimeout);
    socket.on("battle:opponent_disconnected", onOpponentDisconnected);
    socket.on("battle:opponent_reconnected", onOpponentReconnected);
    socket.on("battle:error", onError);

    // If a battleId was provided (e.g. navigated to /battle/[id]),
    // join the room to receive the current state from the server
    if (battleId) {
      socket.emit("battle:join", { battleId });
    }

    return () => {
      socket.off("battle:started", onStarted);
      socket.off("battle:state", onState);
      socket.off("battle:phase_changed", onPhaseChanged);
      socket.off("battle:round_update", onRoundUpdate);
      socket.off("battle:complete", onComplete);
      socket.off("battle:queued", onQueued);
      socket.off("battle:matched", onMatched);
      socket.off("battle:matchmaking_timeout", onMatchmakingTimeout);
      socket.off("battle:opponent_disconnected", onOpponentDisconnected);
      socket.off("battle:opponent_reconnected", onOpponentReconnected);
      socket.off("battle:error", onError);
      // Do NOT disconnect socket here — it's a singleton shared across pages.
      // Disconnecting would kill the connection during page navigation.
    };
  }, [session?.accessToken, battleId]);

  // -- Actions --------------------------------------------------------------

  const createBotBattle = useCallback(() => {
    if (!socketRef.current) return;
    dispatch({ type: "CONNECTING" });
    socketRef.current.emit("battle:create_bot");
  }, []);

  const searchOpponent = useCallback((rating?: number) => {
    if (!socketRef.current) return;
    dispatch({ type: "SEARCHING" });
    socketRef.current.emit("battle:matchmake", { rating });
  }, []);

  const cancelSearch = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("battle:cancel_matchmake");
    dispatch({ type: "RESET" });
  }, []);

  const selectCategory = useCallback((category: string) => {
    if (!socketRef.current || !battleIdRef.current) return;
    socketRef.current.emit("battle:category", {
      battleId: battleIdRef.current,
      category,
    });
  }, []);

  const attack = useCallback(
    (difficulty: Difficulty, answerIndex: number, questionId: string) => {
      if (!socketRef.current || !battleIdRef.current) return;
      socketRef.current.emit("battle:attack", {
        battleId: battleIdRef.current,
        difficulty,
        answerIndex,
        questionId,
      });
    },
    [],
  );

  const defend = useCallback((defenseType: DefenseType) => {
    if (!socketRef.current || !battleIdRef.current) return;
    socketRef.current.emit("battle:defend", {
      battleId: battleIdRef.current,
      defenseType,
    });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    battleIdRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    disconnectBattleSocket();
    dispatch({ type: "RESET" });
    battleIdRef.current = null;
  }, []);

  return {
    ...state,
    createBotBattle,
    searchOpponent,
    cancelSearch,
    selectCategory,
    attack,
    defend,
    reset,
    disconnect,
  };
}

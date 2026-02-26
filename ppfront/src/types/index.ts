// Room states
export type RoomState = "idle" | "voting" | "revealed" | "counting_down";

// Ticket statuses
export type TicketStatus = "pending" | "voting" | "revealed" | "skipped";

// User in a room
export interface User {
  id: string;
  name: string;
  avatarId: string;
  isAdmin: boolean;
  connected: boolean;
  thinking?: boolean;
}

// Estimation scale definition
export interface EstimationScale {
  id: string;
  name: string;
  values: string[];
}

// Avatar definition
export interface Avatar {
  id: string;
  emoji: string;
  label: string;
}

// Theme types

export type ThemeType = "campfire";

export interface TreeSnapshot {
  id: number;
  x: number;
  y: number;
  size: number;
  burnedAt?: string;
}

export interface CampfireState {
  fireLevel: number;
  lastFedAt: string | null;
  trees: TreeSnapshot[];
}

export type ThemeState = { theme: "campfire"; data: CampfireState };

export interface FeedFirePayload {
  treeId: number;
  fromX: number;
  fromY: number;
}

// Player/theme interaction event
export interface RoomEvent {
  type: string;   // "player_interaction" | "theme_interaction"
  action: string; // "paper_throw", "feed_fire", etc.
  fromId: string;
  toId: string;
  payload?: FeedFirePayload | unknown;
}

// Sanitized room snapshot sent to clients
export interface RoomSnapshot {
  id: string;
  name: string;
  scale: string;
  state: RoomState;
  countdown: number;
  users: User[];
  tickets: TicketSnapshot[];
  currentTicketId: string;
  ticketsEnabled: boolean;
  events?: RoomEvent[];
  themeState?: ThemeState;
}

// Sanitized ticket in a snapshot
export interface TicketSnapshot {
  id: string;
  content: string;
  status: TicketStatus;
  votes: VoteInfo[];
}

// Vote info in a snapshot (value hidden during voting)
export interface VoteInfo {
  userId: string;
  value?: string;
}

// RPC request/response types

export interface CreateRoomRequest {
  scaleId: string;
  userName: string;
  avatarId: string;
}

export interface CreateRoomResponse {
  roomId: string;
  adminSecret: string;
  userId: string;
  state: RoomState;
}

export interface JoinRoomRequest {
  roomId: string;
  userName: string;
  avatarId: string;
  userId?: string;
}

export interface JoinRoomResponse {
  userId: string;
  state: RoomSnapshot;
}

export interface SubmitVoteRequest {
  roomId: string;
  userId: string;
  value: string;
}

export interface RemoveVoteRequest {
  roomId: string;
  userId: string;
}

export interface AddTicketRequest {
  roomId: string;
  adminSecret: string;
  content: string;
}

export interface AddTicketResponse {
  ticketId: string;
}

export interface AdminActionRequest {
  roomId: string;
  adminSecret: string;
}

export interface UpdateRoomNameRequest {
  roomId: string;
  adminSecret: string;
  name: string;
}

export interface SetTicketRequest {
  roomId: string;
  adminSecret: string;
  ticketId: string;
}

// Local storage types

export interface StoredUser {
  name: string;
  avatarId: string;
}

export interface StoredRoomInfo {
  userId: string;
  adminSecret?: string;
}

// Room states
export type RoomState = "idle" | "voting" | "revealed";

// Ticket statuses
export type TicketStatus = "pending" | "voting" | "revealed" | "skipped";

// Vote represents a single user's vote
export interface Vote {
  userId: string;
  value: string;
}

// Ticket within a room
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  votes: Record<string, Vote>;
}

// User in a room
export interface User {
  id: string;
  name: string;
  avatarId: string;
  isAdmin: boolean;
  connected: boolean;
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

// Sanitized room snapshot sent to clients
export interface RoomSnapshot {
  id: string;
  name: string;
  scale: string;
  state: RoomState;
  users: User[];
  tickets: TicketSnapshot[];
  currentTicketId: string;
}

// Sanitized ticket in a snapshot
export interface TicketSnapshot {
  id: string;
  title: string;
  description: string;
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

export interface AddTicketRequest {
  roomId: string;
  adminSecret: string;
  title: string;
  description: string;
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

// Local storage types

export interface StoredUser {
  name: string;
  avatarId: string;
}

export interface StoredRoomInfo {
  userId: string;
  adminSecret?: string;
}

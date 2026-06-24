export interface AppleAccountMetadata {
  calendarSubscribeUrl?: string;
}

export interface AppleConnectedAccountPublic {
  id: string;
  provider: "apple";
  email: string;
  displayName: string;
  providerAccountId: string;
  connectedAt: string;
  calendarSubscribeUrl?: string;
}

export interface AppleIntegrationStatus {
  connected: boolean;
  accounts: AppleConnectedAccountPublic[];
}

export interface AppleCalendarItemDto {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  categoryId: string;
  colour: string;
  notes?: string;
  accountId: string;
  externalId: string;
  provider: "apple";
  connectedAccountId: string;
}

export interface CreateAppleAccountInput {
  email: string;
  displayName?: string;
  calendarSubscribeUrl?: string;
}

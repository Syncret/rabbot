import { Database, Channel } from "koishi";
import { } from 'koishi-plugin-mysql'

declare module 'koishi-core' {
    interface Channel {
        rabbot: RabbotChannelData
    }
};
export interface RabbotChannelData {
    gensinFurn: Record<string, number>
};

Channel.extend(() => ({
    rabbot: { gensinFurn: {} }
}));

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.channel) {
        tables.channel.rabbot = new Domain.Json();
    }
});

export function safeGetRabbotField(channel: Channel.Observed<"rabbot">): undefined;
export function safeGetRabbotField<T extends keyof RabbotChannelData>(channel: Channel.Observed<"rabbot">, field: T): RabbotChannelData[T]
export function safeGetRabbotField<T extends keyof RabbotChannelData>(channel: Channel.Observed<"rabbot">, field?: T): RabbotChannelData[T] | undefined {
    if (channel.rabbot == null) {
        channel.rabbot = { gensinFurn: {} };
    }
    if (channel.rabbot.gensinFurn == null) {
        channel.rabbot.gensinFurn = {};
    }
    if (field) {
        return channel.rabbot[field];
    } else {
        return undefined;
    }
}
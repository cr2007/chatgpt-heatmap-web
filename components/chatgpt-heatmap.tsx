import { ResponsiveCalendarCanvas } from "@nivo/calendar";
import { useTheme } from "next-themes";

export type HeatMapData = DayData[];

export interface DayData {
    value: number;
    day: string;
}

interface AggregatedData {
    oldestDate: Date;
    newestDate: Date;
    heatmapData: HeatMapData;
}

export interface ChatgptSummary {
    title: string;
    create_day: string;
    convo_create_day: string[];
}

function aggregateDateData(data: ChatgptSummary[]): AggregatedData {
    if (data.length === 0) {
        return {
            heatmapData: [],
            create_day: "",
            oldestDate: new Date(),
            newestDate: new Date(),
        } as AggregatedData;
    }

    // Sort the data by date (ascending)
    const sortedData = data.sort((a, b) =>
        a.create_day.localeCompare(b.create_day)
    );

    // Sort the conversation dates within the data by date (ascending)
    sortedData.forEach((item) => {
        item.convo_create_day.sort((a, b) => a.localeCompare(b));
    });

    // Extract the oldest and newest dates
    const oldestDate = sortedData[0].create_day;
    const newestDate = sortedData[sortedData.length - 1].create_day;

    // Aggregate the data into a frequency map
    const frequencyMap: Record<string, number> = {};
    data.forEach((item) => {
        frequencyMap[item.create_day] =
            (frequencyMap[item.create_day] || 0) + 1;

        item.convo_create_day.forEach((convoDay) => {
            frequencyMap[convoDay] = (frequencyMap[convoDay] || 0) + 1;
        });
    });

    const heatmapData: HeatMapData = Object.entries(frequencyMap).map(
        ([day, value]) => ({ day, value })
    );

    return {
        oldestDate: new Date(oldestDate),
        newestDate: new Date(newestDate),
        heatmapData,
    };
}

export const ChatgptHeatmap = ({
    summary,
    vertical = false,
}: {
    summary: ChatgptSummary[];
    vertical: boolean;
}) => {
    const data = aggregateDateData(summary);
    const { theme, resolvedTheme } = useTheme();

    // Resolve the theme if "system" theme is selected
    const effectiveTheme = theme === "system" ? resolvedTheme : theme;

    return (
        <ResponsiveCalendarCanvas
            data={data?.heatmapData}
            from={data?.oldestDate}
            to={data?.newestDate}
            theme={{
                labels: { text: { fill: effectiveTheme === "dark" ? "#fff" : "#000" } },
            }}
            direction={vertical ? "vertical" : "horizontal"}
            emptyColor={effectiveTheme === "dark" ? "#333" : "#eee"}
            colors={["#CCFFCC", "#5CE65C", "#008000"]}
            margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
            yearSpacing={40}
            monthBorderColor={effectiveTheme === "dark" ? "#222" : "#fff"}
            dayBorderWidth={2}
            dayBorderColor={effectiveTheme === "dark" ? "#222" : "#fff"}
            tooltip={({ value, day }) => {
                const titlesForDay = summary
                    .filter(
                        (item) =>
                            item.create_day === day ||
                            item.convo_create_day.includes(day)
                    )
                    .reduce<Record<string, number>>((acc, item) => {
                        // Count occurrences of 'day' in 'convo_create_day'
                        const dayOccurrences = item.convo_create_day.filter(
                            (convoDay) => convoDay === day
                        ).length;

                        // Add occurrences from 'create_day'
                        const totalOccurrences =
                            (item.create_day === day ? 1 : 0) + dayOccurrences;

                        // Increment the count for the title
                        acc[item.title] =
                            (acc[item.title] || 0) + totalOccurrences;
                        return acc;
                    }, {});

                return (
                    <div className="bg-white p-2 rounded-lg shadow-md">
                        <p className="text-center text-base font-medium text-gray-900">
                            {day}: <b>{value}</b>
                        </p>

                        {Object.entries(titlesForDay).map(([title, count]) => (
                            <p
                                key={title}
                                className="text-center text-xs font-medium text-gray-900"
                            >
                                {title}: {count}
                            </p>
                        ))}
                    </div>
                );
            }}
        />
    );
};

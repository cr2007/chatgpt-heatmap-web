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
        a.create_day.localeCompare(b.create_day),
    );

    // Sort the conversation dates within the data by date (ascending)
    sortedData.forEach((item) => {
        item.convo_create_day.sort((a, b) => a.localeCompare(b))
    })

    // Extract the oldest and newest dates
    const oldestDate = sortedData[0].create_day;
    const newestDate = sortedData[sortedData.length - 1].create_day

    // Aggregate the data into a frequency map
    const frequencyMap: Record<string, number> = {};
    data.forEach(item => {
        frequencyMap[item.create_day] = (frequencyMap[item.create_day] || 0) + 1;
    });

    const heatmapData: HeatMapData = Object.entries(frequencyMap).map(
        ([day, value]) => ({ day, value }),
    );

    return {
        oldestDate: new Date(oldestDate),
        newestDate: new Date(newestDate),
        heatmapData
    }
}

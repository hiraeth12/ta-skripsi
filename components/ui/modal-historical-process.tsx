import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

type HistoryRow = {
    timestamp: string;
    otMin: string;
    latitude: string;
    longitude: string;
    depth: string;
    phaseCount: string;
    magType: string;
    magnitude: string;
    magCount: string;
    status: string;
};

function parseHistoryTxt(raw: string): HistoryRow[] {
    const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));

    return lines.map((line) => {
        const cols = line.split("|").map((c) => c.trim());
        return {
            timestamp: cols[0] ?? "-",
            otMin: cols[1] ?? "-",
            latitude: cols[2] ?? "-",
            longitude: cols[3] ?? "-",
            depth: cols[4] ?? "-",
            phaseCount: cols[5] ?? "-",
            magType: cols[6] || "-",
            magnitude: cols[7] || "-",
            magCount: cols[8] ?? "-",
            status: cols[9] ?? "-",
        };
    });
}

type ModalHistoricalProcessProps = {
    visible: boolean;
    rawContent: string | null;
    loading: boolean;
    onClose: () => void;
};

export function ModalHistoricalProcess({
    visible,
    rawContent,
    loading,
    onClose,
}: ModalHistoricalProcessProps) {
    const { height } = useWindowDimensions();

    const rows = useMemo(
        () => (rawContent ? parseHistoryTxt(rawContent) : []),
        [rawContent],
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.card, { height: height * 0.9 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>PROSES HISTORIS</Text>
                            <Text style={styles.subtitle}>
                                Riwayat pembaruan parameter gempa oleh BMKG
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="#1E6F9F" />
                            <Text style={styles.loadingText}>Memuat data historis...</Text>
                        </View>
                    ) : rows.length === 0 ? (
                        <View style={styles.centered}>
                            <Ionicons name="analytics-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyText}>
                                Data historis belum tersedia.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1 }}>
                            {/* Legend */}

                            <View style={styles.legendRow}>
                                <Text style={styles.legendText}>
                                    Berikut ini merupakan historical proses perhitungan parameter gempabumi sejalan dengan 
                                    datang atau bertambahnya data waveform seismik dari stasiun remote
                                </Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={styles.legendDot} />
                                <Text style={styles.legendText}>
                                    Setiap baris = satu pembaruan parameter sejak gempa terdeteksi
                                </Text>
                            </View>

                            {rows.map((row, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.rowCard,
                                        idx === rows.length - 1 && styles.rowCardLast,
                                    ]}
                                >
                                    {/* Header baris: timestamp + status */}
                                    <View style={styles.rowHeader}>
                                        <Text style={styles.rowTimestamp}>{row.timestamp} UTC</Text>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                row.status === "A"
                                                    ? styles.statusAutomatic
                                                    : styles.statusManual,
                                            ]}
                                        >
                                            <Text style={styles.statusText}>
                                                {row.status === "A" ? "AUTO" : row.status === "M" ? "MANUAL" : row.status}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Grid 2 kolom */}
                                    <View style={styles.grid}>
                                        <DataCell label="+OT" value={`${row.otMin} mnt`} />
                                        <DataCell label="Fase" value={row.phaseCount} />
                                        <DataCell label="Lintang" value={`${row.latitude}°`} />
                                        <DataCell label="Bujur" value={`${row.longitude}°`} />
                                        <DataCell label="Kedalaman" value={`${row.depth} km`} />
                                        <DataCell
                                            label="Magnitudo"
                                            value={
                                                row.magnitude !== "-"
                                                    ? `${row.magType !== "-" ? row.magType + " " : ""}${row.magnitude} (${row.magCount})`
                                                    : "-"
                                            }
                                            highlight={row.magnitude !== "-"}
                                        />
                                    </View>
                                </View>
                            ))}

                            <View style={{ height: 20 }} />
                        </ScrollView>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            * Data pembaruan parameter real-time dari sistem BMKG
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function DataCell({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <View style={styles.cell}>
            <Text style={styles.cellLabel}>{label}</Text>
            <Text style={[styles.cellValue, highlight && styles.cellValueHighlight]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
    },
    card: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        width: "100%",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    title: {
        color: "#0C4A6E",
        fontWeight: "700",
        fontSize: 16,
    },
    subtitle: {
        fontSize: 11,
        color: "#777",
        marginTop: 1,
    },
    closeBtn: {
        backgroundColor: "#f0f0f0",
        borderRadius: 20,
        padding: 4,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 14,
        color: "#64748B",
    },
    emptyText: {
        fontSize: 14,
        color: "#94A3B8",
        textAlign: "center",
    },
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 6,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#1E6F9F",
    },
    legendText: {
        fontSize: 11,
        color: "#64748B",
        flex: 1,
    },
    rowCard: {
        marginHorizontal: 16,
        marginTop: 10,
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        overflow: "hidden",
    },
    rowCardLast: {
        borderColor: "#1E6F9F",
        borderWidth: 1.5,
    },
    rowHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#EFF6FF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    rowTimestamp: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1E40AF",
        fontVariant: ["tabular-nums"],
    },
    statusBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    statusAutomatic: {
        backgroundColor: "#FEF3C7",
    },
    statusManual: {
        backgroundColor: "#DCFCE7",
    },
    statusText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#374151",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: 10,
        gap: 6,
    },
    cell: {
        width: "47%",
        backgroundColor: "#fff",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    cellLabel: {
        fontSize: 10,
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    cellValue: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1E293B",
        fontVariant: ["tabular-nums"],
    },
    cellValueHighlight: {
        color: "#1E6F9F",
    },
    footer: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        backgroundColor: "#fafafa",
    },
    footerText: {
        textAlign: "center",
        fontSize: 12,
        color: "#1E6F9F",
        fontWeight: "500",
    },
});
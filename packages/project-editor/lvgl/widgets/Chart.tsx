import React from "react";
import { makeObservable, observable } from "mobx";

import { ColorFormat } from "project-editor/features/style/color-format";

import {
    ClassInfo,
    EezObject,
    IMessage,
    MessageType,
    PropertyType,
    getParent,
    makeDerivedClassInfo
} from "project-editor/core/object";

import {
    getName,
    NamingConvention,
    ProjectType
} from "project-editor/project/project";

import { specificGroup } from "project-editor/ui-components/PropertyGrid/groups";

import { LVGLWidget } from "./internal";
import { getChildOfObject, Message } from "project-editor/store";
import { ProjectEditor } from "project-editor/project-editor-interface";
import { LV_CHART_AXIS } from "project-editor/lvgl/lvgl-constants";
import type { LVGLCode } from "project-editor/lvgl/to-lvgl-code";

////////////////////////////////////////////////////////////////////////////////

export class LVGLChartSeries extends EezObject {
    identifier: string;
    color: string;
    axis: keyof typeof LV_CHART_AXIS;
    rangeMin: number;
    rangeMax: number;
    previewValue: number;

    static classInfo: ClassInfo = {
        properties: [
            {
                name: "identifier",
                displayName: "Name",
                type: PropertyType.String,
                isOptional: true
            },
            {
                name: "codeIdentifier",
                type: PropertyType.String,
                computed: true,
                formText: `This identifier will be used in the generated source code. It is different from the "Name" above because in the source code we are following "lowercase with underscore" naming convention.`,
                disabled: (object: LVGLChartSeries) =>
                    object.codeIdentifier == undefined
            },
            {
                name: "color",
                type: PropertyType.ThemedColor
            },
            {
                name: "axis",
                displayName: "Y axis",
                type: PropertyType.Enum,
                enumItems: Object.keys(LV_CHART_AXIS).map(id => ({
                    id,
                    label: id
                })),
                enumDisallowUndefined: true
            },
            {
                name: "rangeMin",
                displayName: "Range min",
                type: PropertyType.Number,
                isOptional: true
            },
            {
                name: "rangeMax",
                displayName: "Range max",
                type: PropertyType.Number,
                isOptional: true
            },
            {
                name: "previewValue",
                displayName: "Preview value",
                type: PropertyType.Number,
                isOptional: true,
                formText:
                    "Used only inside the editor: the series is drawn as a horizontal line at this value, so colors and ranges can be previewed. It is not exported into the generated source code."
            }
        ],

        listLabel: (series: LVGLChartSeries, collapsed: boolean) => {
            const seriesIndex = (getParent(series) as LVGLChartSeries[]).indexOf(
                series
            );

            if (collapsed) {
                return (
                    <>
                        <span style={{ fontWeight: "bold", marginRight: 10 }}>
                            #{seriesIndex}
                        </span>
                        <span>{series.identifier ?? ""}</span>
                    </>
                );
            }

            return <span style={{ fontWeight: "bold" }}>#{seriesIndex}</span>;
        },

        defaultValue: {
            color: "#2196f3",
            axis: "PRIMARY_Y"
        },

        check: (series: LVGLChartSeries, messages: IMessage[]) => {
            const project = ProjectEditor.getProject(series);

            if (!ColorFormat.isValid(series.color, project)) {
                messages.push(
                    new Message(
                        MessageType.ERROR,
                        `invalid color`,
                        getChildOfObject(series, "color")
                    )
                );
            }

            if (
                series.rangeMin != undefined &&
                series.rangeMax != undefined &&
                series.rangeMin > series.rangeMax
            ) {
                messages.push(
                    new Message(
                        MessageType.ERROR,
                        `Range min must be less than or equal to Range max`,
                        getChildOfObject(series, "rangeMin")
                    )
                );
            }
        }
    };

    override makeEditable() {
        super.makeEditable();

        makeObservable(this, {
            identifier: observable,
            color: observable,
            axis: observable,
            rangeMin: observable,
            rangeMax: observable,
            previewValue: observable
        });
    }

    get codeIdentifier() {
        if (!this.identifier) {
            return undefined;
        }

        const codeIdentifier = getName(
            "",
            this.identifier,
            NamingConvention.UnderscoreLowerCase
        );

        if (codeIdentifier == this.identifier) {
            return undefined;
        }

        return codeIdentifier;
    }
}

export class LVGLChartWidget extends LVGLWidget {
    series: LVGLChartSeries[];
    pointCount: number;
    divLineCountH: number;
    divLineCountV: number;

    static classInfo = makeDerivedClassInfo(LVGLWidget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.LVGL,

        componentPaletteGroupName: "!1Visualiser",

        properties: [
            {
                name: "series",
                type: PropertyType.Array,
                typeClass: LVGLChartSeries,
                propertyGridGroup: specificGroup,
                partOfNavigation: false,
                enumerable: false,
                defaultValue: [],
                showArrayCollapsedByDefaultInPropertyGrid: true,
                hideElementIndexInPropertyGrid: true
            },
            {
                name: "pointCount",
                displayName: "Point count",
                type: PropertyType.Number,
                propertyGridGroup: specificGroup
            },
            {
                name: "divLineCountH",
                displayName: "Horizontal div lines",
                type: PropertyType.Number,
                propertyGridGroup: specificGroup
            },
            {
                name: "divLineCountV",
                displayName: "Vertical div lines",
                type: PropertyType.Number,
                propertyGridGroup: specificGroup
            }
        ],

        defaultValue: {
            left: 0,
            top: 0,
            width: 180,
            height: 100,
            clickableFlag: true,
            pointCount: 10,
            divLineCountH: 3,
            divLineCountV: 5,
            series: [Object.assign({}, LVGLChartSeries.classInfo.defaultValue)]
        },

        beforeLoadHook: (
            object: LVGLChartWidget,
            jsObject: Partial<LVGLChartWidget>
        ) => {
            if (jsObject.pointCount == undefined) {
                jsObject.pointCount = 10;
            }
            if (jsObject.divLineCountH == undefined) {
                jsObject.divLineCountH = 3;
            }
            if (jsObject.divLineCountV == undefined) {
                jsObject.divLineCountV = 5;
            }
        },

        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <line x1="4" y1="19" x2="20" y2="19"></line>
                <polyline points="4 15 8 9 12 11 16 6 20 10"></polyline>
            </svg>
        ),

        lvgl: {
            parts: ["MAIN", "ITEMS", "INDICATOR"],
            defaultFlags:
                "CLICKABLE|CLICK_FOCUSABLE|GESTURE_BUBBLE|PRESS_LOCK|SCROLLABLE|SCROLL_CHAIN_HOR|SCROLL_CHAIN_VER|SCROLL_ELASTIC|SCROLL_MOMENTUM|SCROLL_WITH_ARROW|SNAPPABLE",

            oldInitFlags:
                "PRESS_LOCK|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE|SCROLLABLE|SCROLL_ELASTIC|SCROLL_MOMENTUM|SCROLL_CHAIN",
            oldDefaultFlags:
                "CLICKABLE|PRESS_LOCK|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE|SCROLLABLE|SCROLL_ELASTIC|SCROLL_MOMENTUM|SCROLL_CHAIN"
        }
    });

    override makeEditable() {
        super.makeEditable();

        makeObservable(this, {
            series: observable,
            pointCount: observable,
            divLineCountH: observable,
            divLineCountV: observable
        });
    }

    override toLVGLCode(code: LVGLCode) {
        code.createObject("lv_chart_create");

        code.callObjectFunction(
            "lv_chart_set_point_count",
            this.pointCount ?? 10
        );

        code.callObjectFunction(
            "lv_chart_set_div_line_count",
            this.divLineCountH ?? 3,
            this.divLineCountV ?? 5
        );

        const setRangeFunctionName = code.isLVGLVersion(["8.4.0", "9.2.2"])
            ? "lv_chart_set_range"
            : "lv_chart_set_axis_range";

        (this.series ?? []).forEach((series, i) => {
            const seriesVar = code.genStateVar(
                series.objID,
                "lv_chart_series_t *",
                series.identifier ? `${series.identifier}!` : "series"
            );

            code.buildColor(
                series,
                series.color,
                () => seriesVar,
                (color, seriesVar) => {
                const seriesObj = code.callObjectFunctionWithAssignment(
                    "lv_chart_series_t *",
                    `ser${i}`,
                    "lv_chart_add_series",
                    code.color(color),
                    code.constant(`LV_CHART_AXIS_${series.axis}`)
                );

                code.assingToStateVar(seriesVar, seriesObj);

                if (series.previewValue != undefined) {
                    // editor-only preview: draw the series as a horizontal
                    // line, never exported into the generated source code
                    if (code.pageRuntime && code.pageRuntime.isEditor) {
                        code.callObjectFunction(
                            "lv_chart_set_all_value",
                            seriesObj,
                            series.previewValue
                        );
                    }
                }

                if (
                        series.rangeMin != undefined &&
                        series.rangeMax != undefined
                    ) {
                        code.callObjectFunction(
                            setRangeFunctionName,
                            code.constant(`LV_CHART_AXIS_${series.axis}`),
                            series.rangeMin,
                            series.rangeMax
                        );
                    }
                },
                (color, seriesVar) => {
                    if (code.lvglBuild) {
                        const build = code.lvglBuild;
                        if (code.screensLifetimeSupport) {
                            build.line(
                                `if (${seriesVar}) lv_chart_set_series_color(${code.objectAccessor}, ${seriesVar}, ${color});`
                            );
                        } else {
                            build.line(
                                `lv_chart_set_series_color(${code.objectAccessor}, ${seriesVar}, ${color});`
                            );
                        }
                    } else {
                        code.callObjectFunction(
                            "lv_chart_set_series_color",
                            seriesVar,
                            code.color(color)
                        );
                    }
                }
            );
        });
    }
}

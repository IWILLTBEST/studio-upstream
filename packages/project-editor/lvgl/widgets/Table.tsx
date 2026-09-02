import React from "react";
import { makeObservable, observable } from "mobx";

import {
    ClassInfo,
    EezObject,
    IMessage,
    MessageType,
    PropertyType,
    getParent,
    makeDerivedClassInfo
} from "project-editor/core/object";

import { ProjectType } from "project-editor/project/project";

import { specificGroup } from "project-editor/ui-components/PropertyGrid/groups";

import { LVGLWidget } from "./internal";
import { Message } from "project-editor/store";
import type { LVGLCode } from "project-editor/lvgl/to-lvgl-code";

////////////////////////////////////////////////////////////////////////////////

export class LVGLTableColumn extends EezObject {
    width: number;
    headerText: string;

    static classInfo: ClassInfo = {
        properties: [
            {
                name: "width",
                displayName: "Width",
                type: PropertyType.Number,
                formText: "Column width in pixels."
            },
            {
                name: "headerText",
                displayName: "Header text",
                type: PropertyType.String,
                isOptional: true,
                formText:
                    "If set, this text is written into row 0 of the table (commonly styled as a header row)."
            }
        ],

        listLabel: (column: LVGLTableColumn, collapsed: boolean) => {
            const columnIndex = (getParent(column) as LVGLTableColumn[]).indexOf(
                column
            );

            if (collapsed) {
                return (
                    <>
                        <span style={{ fontWeight: "bold", marginRight: 10 }}>
                            #{columnIndex}
                        </span>
                        <span>{column.headerText ?? ""}</span>
                    </>
                );
            }

            return <span style={{ fontWeight: "bold" }}>#{columnIndex}</span>;
        },

        defaultValue: {
            width: 80
        },

        check: (column: LVGLTableColumn, messages: IMessage[]) => {
            if (column.width == undefined || column.width < 1) {
                messages.push(
                    new Message(
                        MessageType.ERROR,
                        `Column width must be at least 1`,
                        column
                    )
                );
            }
        }
    };

    override makeEditable() {
        super.makeEditable();

        makeObservable(this, {
            width: observable,
            headerText: observable
        });
    }
}

export class LVGLTableWidget extends LVGLWidget {
    rowCount: number;
    columns: LVGLTableColumn[];

    static classInfo = makeDerivedClassInfo(LVGLWidget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.LVGL,

        componentPaletteGroupName: "!1Basic",

        properties: [
            {
                name: "rowCount",
                displayName: "Row count",
                type: PropertyType.Number,
                propertyGridGroup: specificGroup
            },
            {
                name: "columns",
                displayName: "Columns",
                type: PropertyType.Array,
                typeClass: LVGLTableColumn,
                propertyGridGroup: specificGroup,
                partOfNavigation: false,
                enumerable: false,
                defaultValue: [],
                showArrayCollapsedByDefaultInPropertyGrid: true,
                hideElementIndexInPropertyGrid: true
            }
        ],

        defaultValue: {
            left: 0,
            top: 0,
            width: 180,
            height: 100,
            clickableFlag: true,
            rowCount: 4,
            columns: [
                { width: 90, headerText: "Name" },
                { width: 90, headerText: "Value" }
            ]
        },

        beforeLoadHook: (
            object: LVGLTableWidget,
            jsObject: Partial<LVGLTableWidget>
        ) => {
            if (jsObject.rowCount == undefined) {
                jsObject.rowCount = 4;
            }
        },

        icon: (
            <svg viewBox="0 0 16 16">
                <path
                    fill="currentcolor"
                    d="M0 1v15h16V1zm5 14H1v-2h4zm0-3H1v-2h4zm0-3H1V7h4zm0-3H1V4h4zm5 9H6v-2h4zm0-3H6v-2h4zm0-3H6V7h4zm0-3H6V4h4zm5 9h-4v-2h4zm0-3h-4v-2h4zm0-3h-4V7h4zm0-3h-4V4h4z"
                />
            </svg>
        ),

        lvgl: {
            parts: ["MAIN", "ITEMS", "SCROLLBAR"],
            defaultFlags:
                "CLICKABLE|CLICK_FOCUSABLE|GESTURE_BUBBLE|PRESS_LOCK|SCROLLABLE|SCROLL_CHAIN_HOR|SCROLL_CHAIN_VER|SCROLL_ELASTIC|SCROLL_MOMENTUM|SCROLL_WITH_ARROW|SNAPPABLE"
        }
    });

    override makeEditable() {
        super.makeEditable();

        makeObservable(this, {
            rowCount: observable,
            columns: observable
        });
    }

    override toLVGLCode(code: LVGLCode) {
        code.createObject("lv_table_create");

        const columns = this.columns ?? [];
        const rowCount = this.rowCount ?? 4;

        // column count follows the number of column sub-objects
        if (code.isV9) {
            code.callObjectFunction("lv_table_set_column_count", columns.length);
            code.callObjectFunction("lv_table_set_row_count", rowCount);
        } else {
            code.callObjectFunction("lv_table_set_col_cnt", columns.length);
            code.callObjectFunction("lv_table_set_row_cnt", rowCount);
        }

        columns.forEach((column, i) => {
            const width = column.width != undefined && column.width >= 1
                ? column.width
                : 1;

            code.callObjectFunction(
                code.isV9
                    ? "lv_table_set_column_width"
                    : "lv_table_set_col_width",
                i,
                width
            );

            if (column.headerText) {
                code.callObjectFunction(
                    "lv_table_set_cell_value",
                    0,
                    i,
                    code.stringProperty("literal", column.headerText)
                );
            }
        });
    }
}

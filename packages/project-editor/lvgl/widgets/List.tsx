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
import { LVGLPropertyType } from "../expression-property";
import { getChildOfObject, Message } from "project-editor/store";
import type { LVGLCode } from "project-editor/lvgl/to-lvgl-code";

////////////////////////////////////////////////////////////////////////////////

export class LVGLListEntry extends EezObject {
    text: string;
    textType: LVGLPropertyType;
    icon: string;

    static classInfo: ClassInfo = {
        properties: [
            {
                name: "text",
                type: PropertyType.String
            },
            {
                name: "icon",
                type: PropertyType.ObjectReference,
                referencedObjectCollectionPath: "bitmaps",
                isOptional: true
            }
        ],

        listLabel: (entry: LVGLListEntry, collapsed: boolean) => {
            const entryIndex = (getParent(entry) as LVGLListEntry[]).indexOf(
                entry
            );

            if (collapsed) {
                return (
                    <>
                        <span style={{ fontWeight: "bold", marginRight: 10 }}>
                            #{entryIndex}
                        </span>
                        <span>{entry.text ?? ""}</span>
                    </>
                );
            }

            return <span style={{ fontWeight: "bold" }}>#{entryIndex}</span>;
        },

        defaultValue: {
            text: "Item",
            textType: "literal"
        },

        check: (entry: LVGLListEntry, messages: IMessage[]) => {
            if (!entry.text) {
                messages.push(
                    new Message(
                        MessageType.ERROR,
                        `Text is empty`,
                        getChildOfObject(entry, "text")
                    )
                );
            }
        }
    };

    override makeEditable() {
        super.makeEditable();

        makeObservable(this, {
            text: observable,
            textType: observable,
            icon: observable
        });
    }
}

export class LVGLListWidget extends LVGLWidget {
    entries: LVGLListEntry[];

    static classInfo = makeDerivedClassInfo(LVGLWidget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.LVGL,

        componentPaletteGroupName: "!1Basic",

        properties: [
            {
                name: "entries",
                type: PropertyType.Array,
                typeClass: LVGLListEntry,
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
            entries: [
                Object.assign({}, LVGLListEntry.classInfo.defaultValue, {
                    text: "Item 1"
                }),
                Object.assign({}, LVGLListEntry.classInfo.defaultValue, {
                    text: "Item 2"
                })
            ]
        },

        icon: (
            <svg viewBox="0 0 24 24">
                <path
                    d="M4 7a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H5a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2h-9a1 1 0 0 1-1-1zm-5 5a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2h-9a1 1 0 0 1-1-1zm-5 5a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2h-9a1 1 0 0 1-1-1z"
                    fill="currentcolor"
                />
            </svg>
        ),

        lvgl: {
            parts: ["MAIN", "SCROLLBAR"],
            defaultFlags:
                "CLICKABLE|CLICK_FOCUSABLE|GESTURE_BUBBLE|PRESS_LOCK|SCROLLABLE|SCROLL_CHAIN_HOR|SCROLL_CHAIN_VER|SCROLL_ELASTIC|SCROLL_MOMENTUM|SCROLL_WITH_ARROW|SNAPPABLE"
        }
    });

    override makeEditable() {
        super.makeEditable();

        makeObservable(this, {
            entries: observable
        });
    }

    override toLVGLCode(code: LVGLCode) {
        code.createObject("lv_list_create");

        const addEntryFunctionName = code.isV9
            ? "lv_list_add_button"
            : "lv_list_add_btn";

        for (const entry of this.entries ?? []) {
            if (entry.text) {
                code.callObjectFunction(
                    addEntryFunctionName,
                    entry.icon ? code.image(entry.icon) : code.constant("NULL"),
                    code.stringProperty(entry.textType ?? "literal", entry.text)
                );
            }
        }
    }
}

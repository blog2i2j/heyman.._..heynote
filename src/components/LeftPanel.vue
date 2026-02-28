<script>
    import { mapState } from "pinia"

    import { TITLE_BAR_BG_LIGHT, TITLE_BAR_BG_DARK, TITLE_BAR_BG_LIGHT_BLURRED, TITLE_BAR_BG_DARK_BLURRED } from "@/src/common/constants"
    import { useHeynoteStore } from "@/src/stores/heynote-store"
    import { useSettingsStore } from "@/src/stores/settings-store"

    import MainMenuButton from "./tabs/MainMenuButton.vue"
    import BufferTree from "./buffer-tree/BufferTree.vue"

    export default {
        components: {
            MainMenuButton,
            BufferTree,
        },

        computed: {
            ...mapState(useHeynoteStore, [
                "isFocused",
            ]),
            ...mapState(useSettingsStore, [
                "theme",
            ]),

            backgroundColor() {
                if (this.theme === "dark") {
                    return this.isFocused ? TITLE_BAR_BG_DARK : TITLE_BAR_BG_DARK_BLURRED
                } else {
                    return this.isFocused ? TITLE_BAR_BG_LIGHT : TITLE_BAR_BG_LIGHT_BLURRED
                }
            },

            style() {
                return {
                    backgroundColor: this.backgroundColor,
                }
            },
        },
    }
</script>

<template>
    <aside class="left-panel" :style="style">
        <div class="top-bar">
            <MainMenuButton />
        </div>
        <div class="left-panel-content">
            <BufferTree />
        </div>
    </aside>
</template>

<style scoped lang="sass">
    .left-panel
        width: 260px
        flex-shrink: 0
        height: 100%
        min-height: 0
        display: flex
        flex-direction: column

        .top-bar
            height: var(--tab-bar-height)
            flex-shrink: 0
            app-region: drag

        .left-panel-content
            flex-grow: 1
            min-height: 0
            //border-right: 1px solid var(--tab-bar-border-bottom-color)
</style>

<template>
  <div class="combobox-wrapper">
    <input
      type="text"
      class="form-control"
      :class="{ 'is-invalid': invalid }"
      :placeholder="placeholder"
      :value="modelValue"
      :disabled="disabled"
      autocomplete="off"
      @input="onInput"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
    />
    <ul
      v-if="isOpen && options.length"
      class="combobox-dropdown list-unstyled mb-0"
    >
      <li
        v-for="(option, idx) in options"
        :key="option"
        class="dropdown-item"
        :class="{ 'is-active': idx === highlightedIndex }"
        @mousedown.prevent="select(option)"
      >
        {{ option }}
      </li>
    </ul>
    <div v-if="invalid" class="invalid-feedback">{{ invalidMessage }}</div>
  </div>
</template>

<script>
export default {
  name: 'ComboBox',

  props: {
    modelValue: {
      type: String,
      default: ''
    },
    // Function (query: string) => string[] — called reactively as user types
    optionsFn: {
      type: Function,
      required: true
    },
    placeholder: {
      type: String,
      default: 'Type to search…'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    invalid: {
      type: Boolean,
      default: false
    },
    invalidMessage: {
      type: String,
      default: ''
    }
  },

  emits: ['update:modelValue', 'select'],

  data() {
    return {
      isOpen: false,
      options: [],
      highlightedIndex: -1
    }
  },

  methods: {
    onInput(e) {
      const val = e.target.value
      this.$emit('update:modelValue', val)
      this.options = this.optionsFn(val)
      this.highlightedIndex = -1
      this.isOpen = true
    },

    onFocus() {
      this.options = this.optionsFn(this.modelValue)
      this.isOpen = true
    },

    onBlur() {
      // Small delay so mousedown on a list item fires before we close
      setTimeout(() => {
        this.isOpen = false
        this.highlightedIndex = -1
      }, 150)
    },

    onKeydown(e) {
      if (!this.isOpen) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.highlightedIndex = Math.min(
          this.highlightedIndex + 1,
          this.options.length - 1
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (this.highlightedIndex >= 0) {
          this.select(this.options[this.highlightedIndex])
        } else {
          this.isOpen = false
        }
      } else if (e.key === 'Escape') {
        this.isOpen = false
      }
    },

    select(option) {
      this.$emit('update:modelValue', option)
      this.$emit('select', option)
      this.isOpen = false
      this.highlightedIndex = -1
    }
  }
}
</script>

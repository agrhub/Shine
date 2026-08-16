import { ref, watch, onUnmounted } from 'vue';

export function useSliderThrottle(
  valueGetter: () => number,
  onChange: (val: number) => void,
  throttleMs = 50
) {
  const localValue = ref(valueGetter());
  let isDragging = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: number | null = null;

  watch(valueGetter, (newVal) => {
    if (!isDragging) {
      localValue.value = newVal;
    }
  });

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const handleChange = (val: number) => {
    isDragging = true;
    localValue.value = val;
    pendingValue = val;
    if (!timer) {
      timer = setTimeout(() => {
        if (pendingValue !== null) {
          onChange(pendingValue);
        }
        timer = null;
        pendingValue = null;
      }, throttleMs);
    }
  };

  const handleCommit = (val: number) => {
    clearTimer();
    pendingValue = null;
    isDragging = false;
    localValue.value = val;
    onChange(val);
  };

  const handleDirectSet = (val: number) => {
    clearTimer();
    localValue.value = val;
    onChange(val);
  };

  onUnmounted(() => {
    clearTimer();
  });

  return {
    localValue,
    handleChange,
    handleCommit,
    handleDirectSet,
  };
}

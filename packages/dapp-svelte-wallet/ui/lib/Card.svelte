<style>
div {
  border-radius: 3px;
  border: solid 2px;
}

h2 {
  text-transform: uppercase;
}

p {
  color: gray;
}

.featured {
  border-color: gold;
}
</style>

<div class:featured>
  <h2>{title}</h2>
  <p>
    <slot />
  </p>
</div>

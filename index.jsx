import { render, useState, createElement,} from './main';

function App () {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    setCount((c) => c + 1)
  }

  return (
    <div>
      <h3>Build your own React</h3>
      <button onClick={handleClick}>+</button>
      <p>计数器{ count }</p>
    </div>
  )
}

render(
  <App />,
  document.getElementById('root')
)

import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Cohorts from './pages/Cohorts';
import About from './pages/About';

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/cohorts" component={Cohorts} />
        <Route path="/about" component={About} />
      </Switch>
    </Router>
  );
};

export default App;
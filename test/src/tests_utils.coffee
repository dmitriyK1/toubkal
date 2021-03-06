###
    tests_utils.coffee

    Copyright (c) 2013-2016, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

###

# ----------------------------------------------------------------------------------------------
# Source map support for v8 stack traces
# --------------------------------------

this.expect || require( 'source-map-support' ).install()

# ----------------------------------------------------------------------------------------------
# Setup mocha BDD, load expect
# ----------------------------

this.mocha && mocha.setup 'bdd'

this.expect = this.expect || require 'expect.js'

# ----------------------------------------------------------------------------------------------
# Asynchrnous tests exception catcher
# -----------------------------------

this.check = ( done, test ) ->
  try
    test()
    
    done()
  catch e
    done e

# ----------------------------------------------------------------------------------------------
# rs and log
# ----------

this.rs = this.rs || require '../../lib/core.js'

this.log = this.rs.RS.log.bind( null, 'tests,' )

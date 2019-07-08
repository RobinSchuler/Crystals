/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.awt.Image;
import java.io.IOException;
import java.util.ArrayList;

/**
 * 
 * @author Bernd
 */
public class Schleim extends Kreatur
{
	private static final long serialVersionUID = 6749180492621064601L;

	public Schleim(int x, int y)
	{
		super(x, y);
		init();
	}

	public Schleim()
	{
		init();
	}

	private void writeObject(java.io.ObjectOutputStream stream) throws IOException
	{
		stream.writeInt(level);
		stream.writeInt(ruestung);
		stream.writeInt(schaden);
		stream.writeInt(maxLeben);
		stream.writeFloat(abbauzeit);
		stream.writeFloat(angriffszeit);
		stream.writeFloat(regenerationszeit);
		stream.writeFloat(laufgeschwindigkeit);
		stream.writeFloat(letztePosx);
		stream.writeFloat(letztePosy);
		stream.writeFloat(posX);
		stream.writeFloat(posY);
		stream.writeInt(leben);
		stream.writeInt(weg.size());
		for (int i = 0; i < weg.size(); i++)
		{
			stream.writeObject(weg.get(i));
		}
	}

	private void readObject(java.io.ObjectInputStream stream) throws IOException,
			ClassNotFoundException
	{
		init();
		level = stream.readInt();
		ruestung = stream.readInt();
		schaden = stream.readInt();
		maxLeben = stream.readInt();
		abbauzeit = stream.readFloat();
		angriffszeit = stream.readFloat();
		regenerationszeit = stream.readFloat();
		laufgeschwindigkeit = stream.readFloat();
		letztePosx = stream.readFloat();
		letztePosy = stream.readFloat();
		posX = stream.readFloat();
		posY = stream.readFloat();
		leben = stream.readInt();
		int s = stream.readInt();
		weg = new ArrayList<>();
		for (int i = 0; i < s; i++)
		{
			weg.add((Befehl) (stream.readObject()));
		}
		Regenerieren r = new Regenerieren();
		r.start();
	}

	private void init()
	{
		drectionlastmoved = 's';
		ruestung = 0;
		maxLeben = 30;
		leben = 30;
		laufgeschwindigkeit = 0.0004f;
		angriffszeit = 2f;
		abbauzeit = 10;
		schaden = 0;
		regenerationszeit = 20;

		loadSprite("schleim");
	}

	@Override
	public void loadSprite(String name)
	{
		standN = Welt.bildLaden(name + ".png");
		standS = Welt.bildLaden(name + "aktion.png");
	}

	@Override
	public Image gibBild(boolean timer)
	{
		if (timer)
		{
			return standN;
		}
		else
			return standS;
	}

	@Override
	public void levelup()
	{
		level++;
		maxLeben *= 1.5f;
		leben *= 1.5f;
		angriffszeit *= 0.9f;
		laufgeschwindigkeit *= 1.1f;
		regenerationszeit *= 0.95f;
	}

}

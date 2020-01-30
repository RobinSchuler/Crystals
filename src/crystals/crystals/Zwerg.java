/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.io.IOException;
import java.util.ArrayList;


public class Zwerg extends Kreatur
{
	private static final long serialVersionUID = 4966872363327135660L;
	boolean hatAxt = false;
	boolean hatHacke = false;
	boolean hatHammer = false;
	float lampenhelligkeit = 0;

	@Override
	public void update(float fps)
	{
		super.update(fps);
		if (lampenhelligkeit <= DynamicLightSettings.lampenMinDunkelheit)
		{
			lampenhelligkeit += Math.random() * DynamicLightSettings.lampenHelligkeitsaenderung;
		}
		else if (lampenhelligkeit < DynamicLightSettings.lampenMaxDunkelheit)
		{
			lampenhelligkeit += Math.random() * DynamicLightSettings.lampenHelligkeitsaenderung
					* 2 - DynamicLightSettings.lampenHelligkeitsaenderung;
			if (Math.random() < DynamicLightSettings.lampenflackerWahrscheinlicheit)
			{
				lampenhelligkeit = 255;
			}
		}
		else if (lampenhelligkeit < 255)
		{
			lampenhelligkeit -= Math.random() * DynamicLightSettings.lampenHelligkeitsaenderung;
		}
		else if (lampenhelligkeit == 255)
		{
			if (Math.random() < DynamicLightSettings.lampenflackerEndWahrscheinlicheit)
			{
				lampenhelligkeit = (DynamicLightSettings.lampenMaxDunkelheit - DynamicLightSettings.lampenMinDunkelheit) / 2;
			}
		}
	}

	public Zwerg(int x, int y)
	{
		super(x, y);
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
		stream.writeBoolean(hatAxt);
		stream.writeBoolean(hatHacke);
		stream.writeBoolean(hatHammer);
	}

	protected void test()
	{

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
		if (stream.readBoolean())
		{
			hatAxt = true;
			loadSprite("axtzwerg");

		}
		if (stream.readBoolean())
		{

			hatHacke = true;
			loadSprite("arbeitszwerg");

		}
		if (stream.readBoolean())
		{
			hatHammer = true;
			loadSprite("hammerzwerg");

		}
	}

	private void init()
	{
		drectionlastmoved = 's';
		maxLeben = 10;
		leben = 10;
		schaden = 11;
		ruestung = 10;
		angriffszeit = 1;
		abbauzeit = 20;
		regenerationszeit = 30;
		laufgeschwindigkeit = 0.00075f;
		loadSprite("zwerg");

	}

	@Override
	public void levelup()
	{
		level++;
		abbauzeit *= 0.9f;
		angriffszeit *= 0.9f;
		laufgeschwindigkeit *= 1.2f;
		maxLeben *= 1.1f;
		leben *= 1.1f;
		schaden *= 1.2f;
		ruestung *= 1.1f;
		regenerationszeit *= 0.95f;
	}

	public void mitAxtAusruesten()
	{
		if (!hatAxt)
		{
			loadSprite("axtzwerg");

			hatAxt = true;
			if (hatHacke)
			{
				hatHacke = false;
				abbauzeit *= 2;
			}
			if (hatHammer)
			{
				hatHammer = false;
				angriffszeit *= 3;
			}

			schaden *= 2;
		}
	}

	public void mitHammerAusruesten()
	{
		if (!hatHammer)
		{
			loadSprite("hammerzwerg");

			hatHammer = true;
			if (hatHacke)
			{
				hatHacke = false;
				abbauzeit *= 2;
			}
			if (hatAxt)
			{
				hatAxt = false;
				schaden /= 2;
			}

			angriffszeit /= 3;
		}
	}

	public void mitHackeAusruesten()
	{
		if (!hatHacke)
		{
			loadSprite("arbeitszwerg");

			hatHacke = true;
			abbauzeit /= 2;
			if (hatAxt)
			{
				hatAxt = false;
				schaden /= 2;
			}

			if (hatHammer)
			{
				hatHammer = false;
				angriffszeit *= 3;
			}

		}
	}

	public void zurueckruesten()
	{
		loadSprite("zwerg");

		if (hatAxt)
		{
			schaden /= 2;
			hatAxt = false;
		}
		if (hatHacke)
		{
			abbauzeit *= 2;
			hatHacke = false;
		}
		if (hatHammer)
		{
			angriffszeit *= 3;
			hatHammer = false;
		}

	}

	void leveldown()
	{
		if (level > 1)
		{
			level--;
			abbauzeit /= 0.9f;
			angriffszeit /= 0.9f;
			laufgeschwindigkeit /= 1.02f;
			maxLeben /= 1.1f;
			leben /= 1.1f;
			schaden /= 1.1f;
			ruestung /= 1.1f;
			regenerationszeit /= 0.95f;
		}
	}

}
